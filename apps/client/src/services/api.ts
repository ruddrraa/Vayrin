import type { RideStatus } from '../../types';
import { assertNoError, supabase } from './supabaseBase';

type SupabaseRow<T> = T & Record<string, any>;

export const profileService = {
  async getProfile(userId: string): Promise<any | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error && (error as any).code === 'PGRST116') return null;
    assertNoError(error, 'profileService.getProfile');
    return data ?? null;
  },

  async upsertProfile(profile: Record<string, any>): Promise<any> {
    const { data, error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' }).select().single();
    assertNoError(error, 'profileService.upsertProfile');
    return data;
  },

  async getOrCreateProfile(authUser: { id: string; email?: string | null; user_metadata?: any }, timeoutMs = 3000): Promise<any> {
    const fallbackProfile = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      role: authUser.user_metadata?.role || 'USER',
      is_hospital_open: authUser.user_metadata?.role === 'HOSPITAL' ? true : null,
    };

    const profilePromise = supabase.from('profiles').select('*').eq('id', authUser.id).single();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs));

    try {
      const result = (await Promise.race([profilePromise, timeoutPromise])) as any;
      if (result?.data) return result.data;

      if (result?.error?.code === 'PGRST116') {
        const created = await profileService.upsertProfile(fallbackProfile);
        return created || fallbackProfile;
      }

      return fallbackProfile;
    } catch {
      return fallbackProfile;
    }
  },

  async setHospitalOpen(userId: string, isOpen: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_hospital_open: isOpen })
      .eq('id', userId);
    assertNoError(error, 'profileService.setHospitalOpen');
  },

  async updateProfile(userId: string, patch: { name?: string; phone?: string; address?: string; city?: string; logo_url?: string }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    assertNoError(error, 'profileService.updateProfile');
  },
};

export const rideService = {
  async createRideRequest(params: {
    userId: string;
    pickup_lat: number;
    pickup_lng: number;
    pickup_address: string;
    drop_lat: number;
    drop_lng: number;
    drop_address: string;
    price?: number;
    distance?: string;
    duration?: string;
    ambulance_id?: string | null;
  }): Promise<SupabaseRow<any>> {
    // Prefer Edge Function for booking logic (RLS-safe + server-side dispatch)
    const { data, error } = await supabase.functions.invoke('book-ride', {
      body: {
        pickup_lat: params.pickup_lat,
        pickup_lng: params.pickup_lng,
        pickup_address: params.pickup_address,
        drop_lat: params.drop_lat,
        drop_lng: params.drop_lng,
        drop_address: params.drop_address,
        price: params.price,
        distance: params.distance,
        duration: params.duration,
        preferred_ambulance_id: params.ambulance_id ?? null,
        auto_dispatch: false,
      },
    });
    assertNoError(error, 'rideService.createRideRequest (functions.book-ride)');
    return ((data as any)?.ride ?? data) as any;
  },

  async autoDispatchRide(
    rideId: string,
    preferredAmbulanceId?: string | null
  ): Promise<{ ambulanceId: string; driverId: string } | null> {
    // Prefer Edge Function dispatch (single backend call). If not deployed, fallback to DB logic.
    try {
      const { data, error } = await supabase.functions.invoke('book-ride', {
        body: {
          ride_id: rideId,
          preferred_ambulance_id: preferredAmbulanceId ?? null,
          auto_dispatch: true,
        },
      });

      // If function exists but rejects dummy payload, ignore and use fallback.
      if (!error && (data as any)?.dispatch) {
        return (data as any).dispatch as { ambulanceId: string; driverId: string };
      }
    } catch {
      // ignore
    }

    const { data: availableAmbulance, error: ambError } = preferredAmbulanceId
      ? await supabase.from('ambulances').select('*').eq('id', preferredAmbulanceId).single()
      : await supabase.from('ambulances').select('*').eq('status', 'AVAILABLE').limit(1).single();

    assertNoError(ambError, 'rideService.autoDispatchRide (fetch ambulance)');
    if (!availableAmbulance) return null;

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('hospital_id', availableAmbulance.hospital_id)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    // Not fatal: allow fallback assignment
    if (driverError) {
      // ignore
    }

    const assignedDriverId = driver ? driver.id : availableAmbulance.hospital_id;

    const { error: rideUpdateError } = await supabase
      .from('ride_requests')
      .update({
        status: 'accepted',
        ambulance_id: availableAmbulance.id,
        driver_id: assignedDriverId,
      })
      .eq('id', rideId);
    assertNoError(rideUpdateError, 'rideService.autoDispatchRide (update ride)');

    const { error: ambUpdateError } = await supabase
      .from('ambulances')
      .update({ status: 'BUSY' })
      .eq('id', availableAmbulance.id);
    assertNoError(ambUpdateError, 'rideService.autoDispatchRide (update ambulance)');

    return { ambulanceId: availableAmbulance.id, driverId: assignedDriverId };
  },

  async updateRideStatus(params: {
    rideId: string;
    status: RideStatus;
    ambulanceId?: string | null;
    dropLocation?: { lat: number; lng: number } | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: params.status })
      .eq('id', params.rideId);
    assertNoError(error, 'rideService.updateRideStatus');

    if ((params.status === 'completed' || params.status === 'cancelled') && params.ambulanceId) {
      const { error: ambError } = await supabase
        .from('ambulances')
        .update({ status: 'AVAILABLE' })
        .eq('id', params.ambulanceId);
      assertNoError(ambError, 'rideService.updateRideStatus (set ambulance AVAILABLE)');

      if (params.status === 'completed' && params.dropLocation) {
        const { error: locError } = await supabase
          .from('ambulances')
          .update({ location: { lat: params.dropLocation.lat, lng: params.dropLocation.lng } })
          .eq('id', params.ambulanceId);
        assertNoError(locError, 'rideService.updateRideStatus (set ambulance location)');
      }
    }
  },

  async getMyRides(userId: string): Promise<SupabaseRow<any>[]> {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    assertNoError(error, 'rideService.getMyRides');
    return (data ?? []) as any[];
  },

  async acceptRideRequest(params: { rideId: string; driverId: string; ambulanceId: string }): Promise<void> {
    const { error } = await supabase
      .from('ride_requests')
      .update({ driver_id: params.driverId, ambulance_id: params.ambulanceId, status: 'accepted' })
      .eq('id', params.rideId);
    assertNoError(error, 'rideService.acceptRideRequest (ride_requests)');

    const { error: ambError } = await supabase
      .from('ambulances')
      .update({ status: 'BUSY' })
      .eq('id', params.ambulanceId);
    assertNoError(ambError, 'rideService.acceptRideRequest (ambulances)');
  },

  async getActiveRideForUser(userId: string): Promise<SupabaseRow<any> | null> {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['searching', 'accepted', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    // If nothing found, PostgREST can error; treat as null
    if (error && (error as any).code === 'PGRST116') return null;
    assertNoError(error, 'rideService.getActiveRideForUser');
    return (data as any) ?? null;
  },

  async getAvailableRides(): Promise<SupabaseRow<any>[]> {
    const { data, error } = await supabase.from('ride_requests').select('*').eq('status', 'searching');
    assertNoError(error, 'rideService.getAvailableRides');
    return (data ?? []) as any[];
  },

  async getActiveRideForDriver(driverId: string): Promise<SupabaseRow<any> | null> {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('driver_id', driverId)
      .in('status', ['accepted', 'in_progress'])
      .single();
    if (error && (error as any).code === 'PGRST116') return null;
    assertNoError(error, 'rideService.getActiveRideForDriver');
    return (data as any) ?? null;
  },
};

export const driverService = {
  async updateAmbulanceLocation(params: { ambulanceId: string; lat: number; lng: number; heading?: number }): Promise<void> {
    const { error } = await supabase
      .from('ambulances')
      .update({ location: { lat: params.lat, lng: params.lng, heading: params.heading } })
      .eq('id', params.ambulanceId);
    assertNoError(error, 'driverService.updateAmbulanceLocation');
  },
};

export { authService } from './authService';
export { hospitalService } from './hospitalService';
export { inventoryService } from './inventoryService';
export { ordersService } from './ordersService';
export { realtimeService } from './realtimeService';

import { assertNoError, supabase } from './supabaseBase';

export const hospitalService = {
  async fetchAmbulances() {
    const { data, error } = await supabase.from('ambulances').select('*');
    assertNoError(error, 'hospitalService.fetchAmbulances');
    return data ?? [];
  },

  async createAmbulance(params: {
    hospital_id: string;
    plate_number: string;
    driver_name: string;
    type?: string;
    base_charge?: number;
    price_per_km?: number;
    status?: string;
    equipment?: any;
    location?: any;
  }) {
    const { data, error } = await supabase.from('ambulances').insert(params).select().single();
    assertNoError(error, 'hospitalService.createAmbulance');
    return data;
  },

  async updateAmbulance(id: string, patch: Record<string, any>) {
    const { data, error } = await supabase.from('ambulances').update(patch).eq('id', id).select().single();
    assertNoError(error, 'hospitalService.updateAmbulance');
    return data;
  },

  async deleteAmbulance(id: string): Promise<void> {
    const { error } = await supabase.from('ambulances').delete().eq('id', id);
    assertNoError(error, 'hospitalService.deleteAmbulance');
  },

  async setAmbulanceStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('ambulances').update({ status }).eq('id', id);
    assertNoError(error, 'hospitalService.setAmbulanceStatus');
  },

  async fetchDrivers() {
    const { data, error } = await supabase.from('drivers').select('*');
    assertNoError(error, 'hospitalService.fetchDrivers');
    return data ?? [];
  },

  async createDriver(params: {
    hospital_id: string;
    name: string;
    license_number: string;
    contact: string;
    hourly_wage: number;
    status: string;
    total_hours?: number;
  }) {
    const { data, error } = await supabase.from('drivers').insert(params).select().single();
    assertNoError(error, 'hospitalService.createDriver');
    return data;
  },

  async updateDriver(id: string, patch: Record<string, any>) {
    const { data, error } = await supabase.from('drivers').update(patch).eq('id', id).select().single();
    assertNoError(error, 'hospitalService.updateDriver');
    return data;
  },

  async deleteDriver(id: string): Promise<void> {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    assertNoError(error, 'hospitalService.deleteDriver');
  },
};

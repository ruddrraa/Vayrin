
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  Role, Ambulance, BloodStock, CartItem, User, Driver, Order, OrderStatus, RideRequest, RideStatus 
} from '../types';
import { supabase } from '../supabaseClient';

interface AppContextType {
  userRole: Role;
  currentUser: User | null;
  hospitalStatus: boolean;
  toggleHospitalStatus: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;

  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, role: Role) => Promise<void>;
  logout: () => void;
  isLoadingAuth: boolean;
  
  // Resources
  ambulances: Ambulance[];
  addAmbulance: (ambulance: Omit<Ambulance, 'id' | 'location' | 'hospitalId'>) => Promise<void>;
  updateAmbulance: (id: string, data: Partial<Ambulance>) => Promise<void>;
  deleteAmbulance: (id: string) => Promise<void>;
  updateDriverLocation: (ambulanceId: string, lat: number, lng: number, heading: number) => Promise<void>;

  drivers: Driver[];
  addDriver: (driver: Omit<Driver, 'id' | 'hospitalId'>) => Promise<void>;
  updateDriver: (id: string, data: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;

  bloodStock: BloodStock[];
  addBloodStock: (stock: Omit<BloodStock, 'id' | 'hospitalName' | 'hospitalId'>) => Promise<void>;
  updateBloodStock: (id: string, data: Partial<BloodStock>) => Promise<void>;
  deleteBloodStock: (id: string) => Promise<void>;

  // Consumer
  cart: CartItem[];
  addToCart: (item: BloodStock) => void;
  updateCartQuantity: (itemId: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  
  orders: Order[];
  incomingOrders: Order[]; 
  placeOrder: (cartItems: CartItem[], total: number) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;

  // Ride Hailing (Real-time)
  activeRide: RideRequest | null;
  createRideRequest: (req: Omit<RideRequest, 'id' | 'createdAt' | 'status' | 'userId'> & { ambulanceId?: string }) => Promise<string | null>;
  acceptRideRequest: (rideId: string, driverId: string, ambulanceId: string) => Promise<void>;
  updateRideStatus: (rideId: string, status: RideStatus) => Promise<void>;
  cancelRide: (rideId: string) => Promise<void>;
  availableRides: RideRequest[]; // For drivers
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Real-time Data State
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bloodStock, setBloodStock] = useState<BloodStock[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  
  // Ride State
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [availableRides, setAvailableRides] = useState<RideRequest[]>([]);

  // Local State with localStorage persistence
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('lifeline_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lifeline_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('lifeline_cart', JSON.stringify(cart));
  }, [cart]);

  // Persist wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('lifeline_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // --- Mappers ---
  const mapProfileToUser = (data: any): User => ({
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role as Role,
    isHospitalOpen: data.is_hospital_open,
    address: data.address,
    phone: data.phone,
    city: data.city,
    logoUrl: data.logo_url
  });

  const mapAmbulance = (data: any): Ambulance => ({
    id: data.id,
    hospitalId: data.hospital_id,
    plateNumber: data.plate_number,
    driverName: data.driver_name,
    status: data.status,
    location: data.location || { lat: 28.6139, lng: 77.2090 },
    heading: data.location?.heading || 0,
    type: data.type,
    baseCharge: Number(data.base_charge ?? 0),
    pricePerKm: Number(data.price_per_km ?? 0),
    equipment: data.equipment || []
  });

  const randomNearbyPoint = (lat: number, lng: number, minMeters: number, maxMeters: number) => {
      // Generate a point between minMeters and maxMeters from the given location
      const distance = minMeters + Math.random() * (maxMeters - minMeters);
      const angle = Math.random() * 2 * Math.PI; // random direction
      const latOffset = (distance * Math.cos(angle)) / 111320;
      const lngOffset = (distance * Math.sin(angle)) / (111320 * Math.cos(lat * Math.PI / 180));
      return { lat: lat + latOffset, lng: lng + lngOffset };
  };

  const mapDriver = (data: any): Driver => ({
      id: data.id,
      hospitalId: data.hospital_id,
      name: data.name,
      licenseNumber: data.license_number,
      contact: data.contact,
      hourlyWage: data.hourly_wage,
      status: data.status,
      totalHours: data.total_hours || 0
  });

  const mapBlood = (data: any): BloodStock => ({
      id: data.id,
      hospitalId: data.hospital_id,
      hospitalName: data.hospital_name, 
      type: data.type,
      units: data.units,
      price: data.price,
      expiryDate: data.expiry_date,
      isPaused: data.is_paused
  });

  const mapOrder = (data: any): Order => ({
      id: data.id,
      userId: data.user_id,
      hospitalId: data.hospital_id,
      items: data.items, // JSONB
      totalAmount: data.total_amount,
      status: data.status,
      createdAt: data.created_at
  });

  const mapRide = (data: any): RideRequest => ({
    id: data.id,
    userId: data.user_id,
    driverId: data.driver_id || undefined, 
    ambulanceId: data.ambulance_id || undefined,
    pickupLat: data.pickup_lat,
    pickupLng: data.pickup_lng,
    pickupAddress: data.pickup_address,
    dropLat: data.drop_lat,
    dropLng: data.drop_lng,
    dropAddress: data.drop_address,
    status: data.status,
    price: data.price,
    distance: data.distance,
    duration: data.duration,
    createdAt: data.created_at
  });

  // --- 1. Auth & Initial Load ---

  const handleUserSession = async (authUser: { id: string; email?: string; user_metadata?: any }) => {
    console.log("[AppContext] handleUserSession called for:", authUser.email);
    try {
      // Create a profile data object from auth metadata as fallback
      const fallbackProfile = {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        role: authUser.user_metadata?.role || 'USER',
        is_hospital_open: authUser.user_metadata?.role === 'HOSPITAL' ? true : null
      };

      let profileData: any = null;

      // Try to fetch profile with a 3-second timeout
      try {
        console.log("[AppContext] Fetching profile...");
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        );
        
        const result = await Promise.race([profilePromise, timeoutPromise]) as any;
        
        if (result?.data) {
          profileData = result.data;
          console.log("[AppContext] Profile fetched:", profileData?.email, profileData?.role);
        } else if (result?.error?.code === 'PGRST116') {
          // No profile found, try to create one
          console.log("[AppContext] No profile found, creating...");
          const { data: created } = await supabase
            .from('profiles')
            .upsert(fallbackProfile, { onConflict: 'id' })
            .select()
            .single();
          
          profileData = created || fallbackProfile;
        } else {
          console.log("[AppContext] Profile fetch issue, using fallback. Error:", result?.error?.message);
          profileData = fallbackProfile;
        }
      } catch (fetchError: any) {
        console.warn("[AppContext] Profile fetch failed:", fetchError.message);
        profileData = fallbackProfile;
      }

      // Always set the user, even if we're using fallback data
      const user = mapProfileToUser(profileData);
      console.log("[AppContext] Setting currentUser:", user.email, user.role);
      setCurrentUser(user);
      
      // Load data in background, don't block
      loadInitialData(user).catch(e => console.error("[AppContext] loadInitialData error:", e));
      
      console.log("[AppContext] handleUserSession completed successfully");
    } catch (e) {
      console.error("[AppContext] handleUserSession error:", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkSession = async () => {
      console.log("[AppContext] Checking initial session...");
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AppContext] Session error:", error);
          if (mounted) setIsLoadingAuth(false);
          return;
        }
        
        console.log("[AppContext] Initial session:", session ? "Found" : "None");
        
        if (session?.user && mounted) {
           await handleUserSession(session.user);
        }
      } catch (err) {
        console.error("[AppContext] Auth check failed", err);
      } finally {
        if (mounted) {
          console.log("[AppContext] Setting isLoadingAuth to false");
          setIsLoadingAuth(false);
        }
      }
    };
    
    // Timeout fallback - if auth check takes more than 5 seconds, stop loading
    timeoutId = setTimeout(() => {
      if (mounted && isLoadingAuth) {
        console.warn("[AppContext] Auth check timeout - forcing load complete");
        setIsLoadingAuth(false);
      }
    }, 5000);
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AppContext] Auth state changed:", event, session?.user?.email);
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
         console.log("[AppContext] User signed in, loading session...");
         await handleUserSession(session.user);
         setIsLoadingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        console.log("[AppContext] User signed out, clearing state...");
        setCurrentUser(null);
        setAmbulances([]);
        setDrivers([]);
        setOrders([]);
        setIncomingOrders([]);
        setActiveRide(null);
        setAvailableRides([]);
        setIsLoadingAuth(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("[AppContext] Token refreshed");
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const loadInitialData = async (user: User) => {
      console.log("[AppContext] Loading initial data for user:", user.id);
      try {
          await Promise.all([
              fetchAmbulances().catch(e => console.error("fetchAmbulances failed:", e)),
              fetchDrivers().catch(e => console.error("fetchDrivers failed:", e)),
              fetchBloodStock().catch(e => console.error("fetchBloodStock failed:", e)),
              fetchOrders(user).catch(e => console.error("fetchOrders failed:", e)),
              fetchActiveRide(user.id, user.role).catch(e => console.error("fetchActiveRide failed:", e))
          ]);
          console.log("[AppContext] Initial data loaded successfully");
      } catch (e) {
          console.error("[AppContext] loadInitialData error:", e);
      }
  };

  // --- 2. Data Fetching ---

  const fetchAmbulances = async () => {
    const { data } = await supabase.from('ambulances').select('*');
    if (data) setAmbulances(data.map(mapAmbulance));
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*');
    if (data) setDrivers(data.map(mapDriver));
  };

  const fetchBloodStock = async () => {
    const { data } = await supabase.from('blood_stock').select('*');
    if (data) setBloodStock(data.map(mapBlood));
  };

  const fetchOrders = async (user: User) => {
      if (user.role === 'USER') {
          const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if(data) setOrders(data.map(mapOrder));
      } else if (user.role === 'HOSPITAL') {
          const { data } = await supabase.from('orders').select('*').eq('hospital_id', user.id).order('created_at', { ascending: false });
          if(data) setIncomingOrders(data.map(mapOrder));
      }
  };

  const fetchActiveRide = async (userId: string, role: Role) => {
      if (role === 'USER') {
          const { data } = await supabase.from('ride_requests').select('*')
              .eq('user_id', userId)
              .in('status', ['searching', 'accepted', 'in_progress']) 
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
          if (data) setActiveRide(mapRide(data));
      } else if (role === 'DRIVER') {
           const { data } = await supabase.from('ride_requests').select('*').eq('status', 'searching');
           if (data) setAvailableRides(data.map(mapRide));
           
           const { data: active } = await supabase.from('ride_requests').select('*')
               .eq('driver_id', userId)
               .in('status', ['accepted', 'in_progress'])
               .single();
            if (active) setActiveRide(mapRide(active));
      }
  };

  // --- 3. Realtime Subscription ---
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('global_updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulances' }, () => fetchAmbulances())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchDrivers())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_stock' }, () => fetchBloodStock())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders(currentUser))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, (payload) => {
        if (!payload.new || Object.keys(payload.new).length === 0) return;
        const newRide = mapRide(payload.new);
        
        if (currentUser.role === 'USER') {
            if (newRide.userId === currentUser.id) {
                if (['completed', 'cancelled'].includes(newRide.status)) {
                    setActiveRide(null);
                } else {
                    setActiveRide(newRide);
                }
            }
        } else if (currentUser.role === 'DRIVER') {
            if (newRide.status === 'searching') {
                setAvailableRides(prev => {
                    const exists = prev.find(r => r.id === newRide.id);
                    if (exists) return prev;
                    return [...prev, newRide];
                });
            } else if (newRide.driverId === currentUser.id) {
                 if (['completed', 'cancelled'].includes(newRide.status)) {
                    setActiveRide(null);
                } else {
                    setActiveRide(newRide);
                }
            }
            if (newRide.status !== 'searching') {
                setAvailableRides(prev => prev.filter(r => r.id !== newRide.id));
            }
        }
    })
    .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.role]);

  // --- CRUD Actions (Modified for Instant Reactivity) ---

  const addAmbulance = async (ambulance: Omit<Ambulance, 'id' | 'location' | 'hospitalId'>) => {
      if(!currentUser) return;
      
      const { data, error } = await supabase.from('ambulances').insert({
          hospital_id: currentUser.id,
          plate_number: ambulance.plateNumber,
          driver_name: ambulance.driverName,
          type: ambulance.type,
          base_charge: ambulance.baseCharge,
          price_per_km: ambulance.pricePerKm,
          status: ambulance.status,
          equipment: ambulance.equipment,
          location: { lat: 28.6139, lng: 77.2090 }
      }).select().single();

      if (error) throw error;
      if (data) {
          setAmbulances(prev => [...prev, mapAmbulance(data)]);
      }
  };

  const updateAmbulance = async (id: string, data: Partial<Ambulance>) => {
      const dbData: any = {};
      if(data.plateNumber) dbData.plate_number = data.plateNumber;
      if(data.driverName) dbData.driver_name = data.driverName;
      if(data.type) dbData.type = data.type;
      if(data.baseCharge) dbData.base_charge = data.baseCharge;
      if(data.pricePerKm) dbData.price_per_km = data.pricePerKm;
      if(data.status) dbData.status = data.status;

      const { data: updated, error } = await supabase.from('ambulances').update(dbData).eq('id', id).select().single();
      if (error) throw error;
      
      if (updated) {
          setAmbulances(prev => prev.map(a => a.id === id ? mapAmbulance(updated) : a));
      }
  };

  const deleteAmbulance = async (id: string) => {
      await supabase.from('ambulances').delete().eq('id', id);
      setAmbulances(prev => prev.filter(a => a.id !== id));
  };

  const addDriver = async (driver: Omit<Driver, 'id' | 'hospitalId'>) => {
      if(!currentUser) return;
      const { data, error } = await supabase.from('drivers').insert({
          hospital_id: currentUser.id,
          name: driver.name,
          license_number: driver.licenseNumber,
          contact: driver.contact,
          hourly_wage: driver.hourlyWage,
          status: driver.status,
          total_hours: 0
      }).select().single();
      
      if (error) throw error;
      if (data) setDrivers(prev => [...prev, mapDriver(data)]);
  };

  const updateDriver = async (id: string, data: Partial<Driver>) => {
      const dbData: any = {};
      if(data.name) dbData.name = data.name;
      if(data.licenseNumber) dbData.license_number = data.licenseNumber;
      if(data.contact) dbData.contact = data.contact;
      if(data.hourlyWage) dbData.hourly_wage = data.hourlyWage;
      if(data.status) dbData.status = data.status;
      
      const { data: updated, error } = await supabase.from('drivers').update(dbData).eq('id', id).select().single();
      if (error) throw error;
      if (updated) setDrivers(prev => prev.map(d => d.id === id ? mapDriver(updated) : d));
  };

  const deleteDriver = async (id: string) => {
      await supabase.from('drivers').delete().eq('id', id);
      setDrivers(prev => prev.filter(d => d.id !== id));
  };

  const addBloodStock = async (stock: Omit<BloodStock, 'id' | 'hospitalName' | 'hospitalId'>) => {
      if(!currentUser) return;
      const { data, error } = await supabase.from('blood_stock').insert({
          hospital_id: currentUser.id,
          hospital_name: currentUser.name,
          type: stock.type,
          units: stock.units,
          price: stock.price,
          expiry_date: stock.expiryDate,
          is_paused: stock.isPaused
      }).select().single();

      if (error) throw error;
      if (data) setBloodStock(prev => [...prev, mapBlood(data)]);
  };

  const updateBloodStock = async (id: string, data: Partial<BloodStock>) => {
      const dbData: any = {};
      if(data.type) dbData.type = data.type;
      if(data.units) dbData.units = data.units;
      if(data.price) dbData.price = data.price;
      if(data.expiryDate) dbData.expiry_date = data.expiryDate;
      if(data.isPaused !== undefined) dbData.is_paused = data.isPaused;
      
      const { data: updated, error } = await supabase.from('blood_stock').update(dbData).eq('id', id).select().single();
      if (error) throw error;
      if (updated) setBloodStock(prev => prev.map(b => b.id === id ? mapBlood(updated) : b));
  };

  const deleteBloodStock = async (id: string) => {
      await supabase.from('blood_stock').delete().eq('id', id);
      setBloodStock(prev => prev.filter(b => b.id !== id));
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
      // Optimistic update for instant UI feedback
      setIncomingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) {
          // Revert if failed (optional, but good practice)
          console.error("Failed to update status", error);
          fetchOrders(currentUser!); // Force refresh to correct state
          throw error;
      }
  };

  // --- Auth Handlers (Robust) ---

  const login = async (email: string, pass: string) => {
      console.log("Login attempt for:", email);
      setIsLoadingAuth(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        console.log("signInWithPassword result:", { data, error });
        if (error) throw error;
        if (data.user) {
             await handleUserSession(data.user.id);
        }
      } catch (err) {
        console.error("Login error:", err);
        throw err;
      } finally {
        console.log("Login finally - setting isLoadingAuth to false");
        setIsLoadingAuth(false);
      }
  };

  const register = async (name: string, email: string, pass: string, role: Role) => {
    setIsLoadingAuth(true);
    try {
        const { error, data } = await supabase.auth.signUp({ 
            email, password: pass, options: { data: { full_name: name, role: role } }
        });
        if (error) throw error;
        
        if (data.user) {
             // Create profile immediately ensuring row exists before any other fetch
             const { data: profileData, error: profileError } = await supabase.from('profiles').upsert({
                 id: data.user.id,
                 name: name,
                 role: role,
                 email: email
             }).select().single();

             if (profileError) throw profileError;

             // Force session load immediately to prevent "stuck" UI
             if (profileData) {
                 const user = mapProfileToUser(profileData);
                 setCurrentUser(user);
                 await loadInitialData(user);
             }
        }
    } catch (err) {
        throw err;
    } finally {
        setIsLoadingAuth(false);
    }
  };

  // Other Actions
  const toggleHospitalStatus = async () => {
      if (!currentUser) return;
      const newState = !currentUser.isHospitalOpen;
      setCurrentUser(prev => prev ? { ...prev, isHospitalOpen: newState } : null);
      await supabase.from('profiles').update({ is_hospital_open: newState }).eq('id', currentUser.id);
  };

  const updateProfile = async (data: Partial<User>) => {
      if (!currentUser) return;
      const dbData: any = {};
      if(data.name) dbData.name = data.name;
      if(data.phone) dbData.phone = data.phone;
      if(data.address) dbData.address = data.address;
      if(data.city) dbData.city = data.city;
      if(data.logoUrl) dbData.logo_url = data.logoUrl;

      await supabase.from('profiles').update(dbData).eq('id', currentUser.id);
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
  };

  // ... (Keep other existing methods placeOrder, createRideRequest, etc.)
  const placeOrder = async (cartItems: CartItem[], total: number) => {
      if(!currentUser) return;
      
      console.log('[placeOrder] Cart Items:', cartItems);
      
      const ordersByHospital: Record<string, CartItem[]> = {};
      cartItems.forEach(item => {
          if(!ordersByHospital[item.hospitalId]) ordersByHospital[item.hospitalId] = [];
          ordersByHospital[item.hospitalId].push(item);
      });

      // 1. Create Order Records
      const orderPromises = Object.entries(ordersByHospital).map(([hospitalId, items]) => {
          const subTotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
          return supabase.from('orders').insert({
              user_id: currentUser.id,
              hospital_id: hospitalId,
              items: items,
              total_amount: subTotal,
              status: 'PROCESSING'
          }).select().single();
      });

      // 2. Decrement Blood Stock in Supabase
      const stockUpdatePromises = cartItems.map(async (item) => {
          console.log('[placeOrder] Updating stock for item ID:', item.id, 'Quantity to deduct:', item.quantity);
          // Fetch current quantity first to avoid negative stock
          const { data: currentStock, error: fetchError } = await supabase.from('blood_stock').select('units').eq('id', item.id).single();
          console.log('[placeOrder] Current stock from DB:', currentStock, 'Error:', fetchError);
          if (currentStock) {
              const newUnits = Math.max(0, Number(currentStock.units) - item.quantity);
              console.log('[placeOrder] New units to set:', newUnits);
              const { error: updateError } = await supabase.from('blood_stock').update({ units: newUnits }).eq('id', item.id);
              console.log('[placeOrder] Update error:', updateError);
          }
      });

      // Execute all operations in parallel
      const [orderResults] = await Promise.all([
          Promise.all(orderPromises),
          Promise.all(stockUpdatePromises)
      ]);
      
      // 3. Update Local State Instantly
      // Update Orders
      const newOrders = orderResults.map(r => r.data ? mapOrder(r.data) : null).filter(Boolean) as Order[];
      setOrders(prev => [...newOrders, ...prev]);

      // Update Blood Stock locally (reflects the deduction instantly in UI)
      setBloodStock(prev => prev.map(stock => {
          const cartItem = cartItems.find(c => c.id === stock.id);
          if (cartItem) {
              console.log('[placeOrder] Updating local stock:', stock.id, 'from', stock.units, 'to', stock.units - cartItem.quantity);
              return { ...stock, units: Math.max(0, stock.units - cartItem.quantity) };
          }
          return stock;
      }));

      setCart([]);
  };

    const createRideRequest = async (req: Omit<RideRequest, 'id' | 'createdAt' | 'status' | 'userId'> & { ambulanceId?: string }) => {
      if (!currentUser) return null;

        const { data: rideData, error } = await supabase.from('ride_requests').insert({
        user_id: currentUser.id,
        pickup_lat: req.pickupLat,
        pickup_lng: req.pickupLng,
        pickup_address: req.pickupAddress,
        drop_lat: req.dropLat,
        drop_lng: req.dropLng,
        drop_address: req.dropAddress,
        price: req.price,
        distance: req.distance,
        duration: req.duration,
        ambulance_id: req.ambulanceId || null,
          status: 'searching'
      }).select().single();

      if (error) {
        console.error("Ride creation failed:", error);
        return null;
      }
      
      let ride = mapRide(rideData);
      setActiveRide(ride);

      // Auto-dispatch logic (pick chosen ambulance first)
        const targetAmbulanceId = req.ambulanceId;
        const { data: availableAmbulance } = targetAmbulanceId
          ? await supabase.from('ambulances').select('*').eq('id', targetAmbulanceId).single()
          : await supabase
            .from('ambulances')
            .select('*')
            .eq('status', 'AVAILABLE')
            .limit(1)
            .single();

      if (availableAmbulance) {
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('hospital_id', availableAmbulance.hospital_id)
          .eq('status', 'ACTIVE')
          .limit(1)
          .single();

        const assignedDriverId = driver ? driver.id : availableAmbulance.hospital_id;

        // Use ambulance's existing location from DB (no random seeding)
        // The ambulance location should already be set in Supabase

        await supabase.from('ride_requests').update({
          status: 'accepted',
          ambulance_id: availableAmbulance.id,
          driver_id: assignedDriverId
        }).eq('id', ride.id);

        await supabase.from('ambulances').update({ status: 'BUSY' }).eq('id', availableAmbulance.id);

        ride = { ...ride, status: 'accepted', ambulanceId: availableAmbulance.id, driverId: assignedDriverId };
        setActiveRide(ride);
      }
      return ride.id;
    };

  const updateDriverLocation = async (ambulanceId: string, lat: number, lng: number, heading: number) => {
      await supabase.from('ambulances').update({ location: { lat, lng, heading } }).eq('id', ambulanceId);
  };
  
  // No changes to these, just re-export
  const acceptRideRequest = async (rideId: string, driverId: string, ambulanceId: string) => {
      const { error } = await supabase.from('ride_requests').update({ driver_id: driverId, ambulance_id: ambulanceId, status: 'accepted' }).eq('id', rideId);
      if (!error) await supabase.from('ambulances').update({ status: 'BUSY' }).eq('id', ambulanceId);
      if (error) throw error;
  };
  const updateRideStatus = async (rideId: string, status: RideStatus) => {
      const { error } = await supabase.from('ride_requests').update({ status }).eq('id', rideId);
      if (!error && (status === 'completed' || status === 'cancelled')) {
          if (activeRide?.ambulanceId) {
              await supabase.from('ambulances').update({ status: 'AVAILABLE' }).eq('id', activeRide.ambulanceId);
              
              // Update ambulance location to drop location after ride completes
              if (status === 'completed' && activeRide) {
                  await supabase.from('ambulances').update({ 
                      location: { lat: activeRide.dropLat, lng: activeRide.dropLng } 
                  }).eq('id', activeRide.ambulanceId);
              }
          }
        // Reset local active ride so UI returns to request state
        setActiveRide(null);
      }
      if (error) throw error;
  };
  const cancelRide = async (rideId: string) => { await updateRideStatus(rideId, 'cancelled'); setActiveRide(null); };

  // --- Local Actions & Helpers ---
  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAmbulances([]);
    setDrivers([]);
    setOrders([]);
    setIncomingOrders([]);
    setActiveRide(null);
    setAvailableRides([]);
    setCart([]);
    setWishlist([]);
    // Clear all localStorage
    localStorage.removeItem('userDashboardTab');
    localStorage.removeItem('hospitalDashboardTab');
    localStorage.removeItem('driverStatus');
    localStorage.removeItem('lifeline_cart');
    localStorage.removeItem('lifeline_wishlist');
  };

  const addToCart = (item: BloodStock) => {
    setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
            return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.id === itemId) {
              const newQty = Math.max(1, item.quantity + delta);
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (id: string) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <AppContext.Provider
      value={{
        userRole: currentUser?.role || 'GUEST',
        currentUser,
        hospitalStatus: currentUser?.isHospitalOpen || false,
        toggleHospitalStatus,
        updateProfile,
        login,
        register,
        logout,
        isLoadingAuth,
        ambulances,
        addAmbulance,
        updateAmbulance,
        deleteAmbulance,
        updateDriverLocation,
        drivers,
        addDriver,
        updateDriver,
        deleteDriver,
        bloodStock,
        addBloodStock,
        updateBloodStock,
        deleteBloodStock,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        wishlist,
        toggleWishlist,
        orders,
        incomingOrders,
        placeOrder,
        updateOrderStatus,
        activeRide,
        availableRides,
        createRideRequest,
        acceptRideRequest,
        updateRideStatus,
        cancelRide
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

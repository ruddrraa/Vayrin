
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  Role, Ambulance, BloodStock, CartItem, User, Driver, Order, OrderStatus, RideRequest, RideStatus 
} from '../types';
import { authService, driverService, hospitalService, inventoryService, ordersService, profileService, realtimeService, rideService } from '@/src/services/api';

interface AppContextType {
  userRole: Role;
  currentUser: User | null;
  hospitalStatus: boolean;
  toggleHospitalStatus: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;

  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, role: Role) => Promise<boolean>;
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
    primaryDriverId: data.primary_driver_id || null,
    alternateDriverId: data.alternate_driver_id || null,
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
      const profileData = await profileService.getOrCreateProfile(authUser);

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
        const session = await authService.getSession();
        console.log("[AppContext] Initial session:", session ? "Found" : "None");
        if (session?.user && mounted) await handleUserSession(session.user as any);
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

    const subscription = authService.onAuthStateChange(async (event, session) => {
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
    const rows = await hospitalService.fetchAmbulances();
    setAmbulances(rows.map(mapAmbulance));
  };

  const fetchDrivers = async () => {
    const rows = await hospitalService.fetchDrivers();
    setDrivers(rows.map(mapDriver));
  };

  const fetchBloodStock = async () => {
    const rows = await inventoryService.fetchBloodStock();
    setBloodStock(rows.map(mapBlood));
  };

  const fetchOrders = async (user: User) => {
      if (user.role === 'USER') {
        const rows = await ordersService.fetchOrdersForUser(user.id);
        setOrders(rows.map(mapOrder));
      } else if (user.role === 'HOSPITAL') {
        const rows = await ordersService.fetchOrdersForHospital(user.id);
        setIncomingOrders(rows.map(mapOrder));
      }
  };

  const fetchActiveRide = async (userId: string, role: Role) => {
      if (role === 'USER') {
        const row = await rideService.getActiveRideForUser(userId);
        if (row) setActiveRide(mapRide(row));
      } else if (role === 'DRIVER') {
         const available = await rideService.getAvailableRides();
         setAvailableRides(available.map(mapRide));

         const active = await rideService.getActiveRideForDriver(userId);
         if (active) setActiveRide(mapRide(active));
      }
  };

  // --- 3. Realtime Subscription ---
  useEffect(() => {
    if (!currentUser) return;

    const sub = realtimeService.subscribeGlobalUpdates({
      onAmbulances: () => fetchAmbulances(),
      onDrivers: () => fetchDrivers(),
      onBloodStock: () => fetchBloodStock(),
      onOrders: () => fetchOrders(currentUser),
      onRideRequests: (payload) => {
        if (!payload.new || Object.keys(payload.new).length === 0) return;
        const newRide = mapRide(payload.new);
        console.log('[Realtime] ride_requests update:', newRide.status, newRide.id);
        
        if (currentUser.role === 'USER') {
            if (newRide.userId === currentUser.id) {
                if (['completed', 'cancelled'].includes(newRide.status)) {
                    console.log('[Realtime] Ride completed/cancelled, clearing activeRide');
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
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [currentUser?.id, currentUser?.role]);

  // --- CRUD Actions (Modified for Instant Reactivity) ---

  const addAmbulance = async (ambulance: Omit<Ambulance, 'id' | 'location' | 'hospitalId'>) => {
      if(!currentUser) return;

      const row = await hospitalService.createAmbulance({
      hospital_id: currentUser.id,
      plate_number: ambulance.plateNumber,
      driver_name: ambulance.driverName,
      primary_driver_id: ambulance.primaryDriverId || null,
      alternate_driver_id: ambulance.alternateDriverId || null,
      type: ambulance.type,
      base_charge: ambulance.baseCharge,
      price_per_km: ambulance.pricePerKm,
      status: ambulance.status,
      equipment: ambulance.equipment,
      location: { lat: 28.6139, lng: 77.2090 },
      });
      if (row) setAmbulances(prev => [...prev, mapAmbulance(row)]);
  };

  const updateAmbulance = async (id: string, data: Partial<Ambulance>) => {
      const dbData: any = {};
      if(data.plateNumber) dbData.plate_number = data.plateNumber;
      if(data.driverName !== undefined) dbData.driver_name = data.driverName;
      if(data.primaryDriverId !== undefined) dbData.primary_driver_id = data.primaryDriverId;
      if(data.alternateDriverId !== undefined) dbData.alternate_driver_id = data.alternateDriverId;
      if(data.type) dbData.type = data.type;
      if(data.baseCharge) dbData.base_charge = data.baseCharge;
      if(data.pricePerKm) dbData.price_per_km = data.pricePerKm;
      if(data.status) dbData.status = data.status;

      const updated = await hospitalService.updateAmbulance(id, dbData);
      if (updated) setAmbulances(prev => prev.map(a => a.id === id ? mapAmbulance(updated) : a));
  };

  const deleteAmbulance = async (id: string) => {
      await hospitalService.deleteAmbulance(id);
      setAmbulances(prev => prev.filter(a => a.id !== id));
  };

  const addDriver = async (driver: Omit<Driver, 'id' | 'hospitalId'>) => {
      if(!currentUser) return;
      const row = await hospitalService.createDriver({
      hospital_id: currentUser.id,
      name: driver.name,
      license_number: driver.licenseNumber,
      contact: driver.contact,
      hourly_wage: driver.hourlyWage,
      status: driver.status,
      total_hours: 0,
      });
      if (row) setDrivers(prev => [...prev, mapDriver(row)]);
  };

  const updateDriver = async (id: string, data: Partial<Driver>) => {
      const dbData: any = {};
      if(data.name) dbData.name = data.name;
      if(data.licenseNumber) dbData.license_number = data.licenseNumber;
      if(data.contact) dbData.contact = data.contact;
      if(data.hourlyWage) dbData.hourly_wage = data.hourlyWage;
      if(data.status) dbData.status = data.status;

      const updated = await hospitalService.updateDriver(id, dbData);
      if (updated) setDrivers(prev => prev.map(d => d.id === id ? mapDriver(updated) : d));
  };

  const deleteDriver = async (id: string) => {
      await hospitalService.deleteDriver(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
  };

  const addBloodStock = async (stock: Omit<BloodStock, 'id' | 'hospitalName' | 'hospitalId'>) => {
      if(!currentUser) return;
      const row = await inventoryService.createBloodStock({
      hospital_id: currentUser.id,
      hospital_name: currentUser.name,
      type: stock.type,
      units: stock.units,
      price: stock.price,
      expiry_date: stock.expiryDate,
      is_paused: stock.isPaused,
      });
      if (row) setBloodStock(prev => [...prev, mapBlood(row)]);
  };

  const updateBloodStock = async (id: string, data: Partial<BloodStock>) => {
      const dbData: any = {};
      if(data.type) dbData.type = data.type;
      if(data.units) dbData.units = data.units;
      if(data.price) dbData.price = data.price;
      if(data.expiryDate) dbData.expiry_date = data.expiryDate;
      if(data.isPaused !== undefined) dbData.is_paused = data.isPaused;

      const updated = await inventoryService.updateBloodStock(id, dbData);
      if (updated) setBloodStock(prev => prev.map(b => b.id === id ? mapBlood(updated) : b));
  };

  const deleteBloodStock = async (id: string) => {
      await inventoryService.deleteBloodStock(id);
      setBloodStock(prev => prev.filter(b => b.id !== id));
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
      // Optimistic update for instant UI feedback
      setIncomingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

        try {
          await ordersService.updateOrderStatus(orderId, status);
        } catch (error) {
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
        const data = await authService.signInWithPassword(email, pass);
        console.log("signInWithPassword result:", { data });
        if (data.user) await handleUserSession(data.user as any);
      } catch (err) {
        console.error("Login error:", err);
        throw err;
      } finally {
        console.log("Login finally - setting isLoadingAuth to false");
        setIsLoadingAuth(false);
      }
  };

  const register = async (name: string, email: string, pass: string, role: Role): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      const data = await authService.signUp({ name, email, password: pass, role });
      if (data.user) {
        const profileData = await profileService.upsertProfile({ id: data.user.id, name, role, email });
          if (data.session) {
            const user = mapProfileToUser(profileData);
            setCurrentUser(user);
            await loadInitialData(user);
          }
      }
        return Boolean(data.session);
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
      await profileService.setHospitalOpen(currentUser.id, newState);
  };

  const updateProfile = async (data: Partial<User>) => {
      if (!currentUser) return;
      const dbData: any = {};
      if(data.name) dbData.name = data.name;
      if(data.phone) dbData.phone = data.phone;
      if(data.address) dbData.address = data.address;
      if(data.city) dbData.city = data.city;
      if(data.logoUrl) dbData.logo_url = data.logoUrl;

      await profileService.updateProfile(currentUser.id, dbData);
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
      const orderPromises = Object.entries(ordersByHospital).map(async ([hospitalId, items]) => {
        const subTotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const row = await ordersService.createOrder({
          user_id: currentUser.id,
          hospital_id: hospitalId,
          items: items,
          total_amount: subTotal,
          status: 'PROCESSING',
        });
        return { data: row };
      });

      // 2. Decrement Blood Stock in Supabase
      const stockUpdatePromises = cartItems.map(async (item) => {
          console.log('[placeOrder] Updating stock for item ID:', item.id, 'Quantity to deduct:', item.quantity);
          // Fetch current quantity first to avoid negative stock
          const currentUnits = await inventoryService.getBloodStockUnits(item.id);
          console.log('[placeOrder] Current stock from DB:', currentUnits);
          if (currentUnits === null || currentUnits === undefined) return;
          const newUnits = Math.max(0, Number(currentUnits) - item.quantity);
          console.log('[placeOrder] New units to set:', newUnits);
          await inventoryService.setBloodStockUnits(item.id, newUnits);
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

      try {
        const rideRow = await rideService.createRideRequest({
          userId: currentUser.id,
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
        });

        let ride = mapRide(rideRow);
        setActiveRide(ride);

        // Don't auto-dispatch - let drivers see and accept the request manually
        // The ride stays in 'searching' status until a driver accepts it

        return ride.id;
      } catch (e) {
        console.error('Ride creation failed:', e);
        return null;
      }
    };

  const updateDriverLocation = async (ambulanceId: string, lat: number, lng: number, heading: number) => {
      await driverService.updateAmbulanceLocation({ ambulanceId, lat, lng, heading });
  };
  
  // Accept ride request and update local state
  const acceptRideRequest = async (rideId: string, driverId: string, ambulanceId: string) => {
      try {
        await rideService.acceptRideRequest({ rideId, driverId, ambulanceId });
        
        // Fetch the updated ride and set as active
        const { data: updatedRide } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('id', rideId)
          .single();
        
        if (updatedRide) {
          setActiveRide(mapRide(updatedRide));
          // Remove from available rides list
          setAvailableRides(prev => prev.filter(r => r.id !== rideId));
        }
      } catch (e) {
        console.error('Accept ride failed:', e);
      }
  };
  const updateRideStatus = async (rideId: string, status: RideStatus) => {
      await rideService.updateRideStatus({
        rideId,
        status,
        ambulanceId: activeRide?.ambulanceId ?? null,
        dropLocation: status === 'completed' && activeRide ? { lat: activeRide.dropLat, lng: activeRide.dropLng } : null,
      });

      if (status === 'completed' || status === 'cancelled') {
        setActiveRide(null);
      }
  };
  const cancelRide = async (rideId: string) => { await updateRideStatus(rideId, 'cancelled'); setActiveRide(null); };

  // --- Local Actions & Helpers ---
  const logout = async () => {
    await authService.signOut();
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

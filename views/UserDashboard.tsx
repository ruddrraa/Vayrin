
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MapComponent } from '../components/MapComponent';
import { Card, Button, Input, Label } from '../components/ui';
import { motion as motionOriginal, AnimatePresence } from 'framer-motion';
import { Navigation, Droplet, ShoppingCart, LogOut, ArrowRight, CheckCircle2, Heart, Trash, CreditCard, X, AlertTriangle, FileText, Package, Clock, Calendar, Settings, Search, MapPin, Ambulance as AmbulanceIcon, LocateFixed, Minus, Plus } from 'lucide-react';
import { Ambulance, AmbulanceStatus, Order } from '../types';
import LocationAutocomplete from '../components/LocationAutocomplete';

const motion = motionOriginal as any;

export default function UserDashboard() {
  const { 
    logout, currentUser, ambulances, updateProfile,
    activeRide, createRideRequest, cancelRide,
    bloodStock, cart, addToCart, removeFromCart, updateCartQuantity, placeOrder,
    wishlist, toggleWishlist, orders
  } = useApp();

  // Tab Persistence Logic
  const [activeTab, setActiveTab] = useState<'RIDE' | 'SHOP' | 'WISHLIST' | 'ORDERS' | 'PROFILE'>(() => {
    return (localStorage.getItem('userDashboardTab') as any) || 'RIDE';
  });

  useEffect(() => {
    localStorage.setItem('userDashboardTab', activeTab);
  }, [activeTab]);

  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // --- Profile State ---
  const [pName, setPName] = useState(currentUser?.name || '');
  const [pPhone, setPPhone] = useState(currentUser?.phone || '');
  const [pAddress, setPAddress] = useState(currentUser?.address || '');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // --- Map & Ride State ---
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 });
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropCoords, setDropCoords] = useState<{lat: number, lng: number} | null>(null);
  const [routePath, setRoutePath] = useState<{ start: { lat: number; lng: number }; end: { lat: number; lng: number } } | null>(null);
  
  // Fake Ambulance Logic
  const [simulatedAmbLocation, setSimulatedAmbLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Autocomplete
    const dropdownRef = useRef<HTMLDivElement>(null);

  // Load existing ride state
  useEffect(() => {
      if (activeRide) {
          setPickup(activeRide.pickupAddress);
          setDrop(activeRide.dropAddress);
          setPickupCoords({ lat: activeRide.pickupLat, lng: activeRide.pickupLng });
          setDropCoords({ lat: activeRide.dropLat, lng: activeRide.dropLng });
      }
  }, [activeRide]);

  // FAKE AMBULANCE SIMULATION
  useEffect(() => {
    let animationFrame: number;
    
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_progress') && pickupCoords) {
        // Initialize fake ambulance start position (slightly offset from pickup) if not set
        if (!simulatedAmbLocation) {
             setSimulatedAmbLocation({ 
                 lat: pickupCoords.lat - 0.01, // Roughly 1km away
                 lng: pickupCoords.lng - 0.01 
             });
        }

        const animate = () => {
            setSimulatedAmbLocation(prev => {
                if (!prev || !pickupCoords) return prev;
                // Move 0.5% closer every frame
                const latDiff = pickupCoords.lat - prev.lat;
                const lngDiff = pickupCoords.lng - prev.lng;
                
                // If close enough, stop
                if (Math.abs(latDiff) < 0.0001 && Math.abs(lngDiff) < 0.0001) return prev;

                return {
                    lat: prev.lat + (latDiff * 0.005),
                    lng: prev.lng + (lngDiff * 0.005)
                };
            });
            animationFrame = requestAnimationFrame(animate);
        };
        
        animationFrame = requestAnimationFrame(animate);
    } else {
        setSimulatedAmbLocation(null);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [activeRide, pickupCoords]);

  // Dynamic Markers & Routing Logic
  const [markers, setMarkers] = useState<Array<{id: string, lat: number, lng: number, type: 'USER' | 'AMBULANCE' | 'DESTINATION'}>>([]);

  useEffect(() => {
    const newMarkers: Array<{id: string, lat: number, lng: number, type: 'USER' | 'AMBULANCE' | 'DESTINATION'}> = [];
    
    // 1. User Pickup
    if (pickupCoords) {
        newMarkers.push({ id: 'pickup', lat: pickupCoords.lat, lng: pickupCoords.lng, type: 'USER' });
    }

    // 2. Dropoff
    if (dropCoords) {
        newMarkers.push({ id: 'drop', lat: dropCoords.lat, lng: dropCoords.lng, type: 'DESTINATION' });
    }

    // 3. Ambulance Tracking (Real or Simulated)
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_progress')) {
        const assignedAmbulance = ambulances.find(a => a.id === activeRide.ambulanceId);
        
        // Use Simulated location if available (for smoother UX/Demo), otherwise real DB location
        const displayLoc = simulatedAmbLocation || (assignedAmbulance ? assignedAmbulance.location : null);

        if (displayLoc) {
            newMarkers.push({
                id: 'ambulance_active',
                lat: displayLoc.lat,
                lng: displayLoc.lng,
                type: 'AMBULANCE'
            });
            
            if (activeRide.status === 'accepted' && pickupCoords) {
                 setRoutePath({ start: displayLoc, end: pickupCoords });
            } else if (dropCoords) {
                setRoutePath({ start: displayLoc, end: dropCoords });
            }
        }
    } else {
        if (pickupCoords && dropCoords) {
            setRoutePath({ start: pickupCoords, end: dropCoords });
        } else {
            setRoutePath(null);
        }
    }

    setMarkers(newMarkers);
  }, [pickupCoords, dropCoords, activeRide, ambulances, simulatedAmbLocation]);

  const handleBookRide = async () => {
    if (!pickupCoords || !dropCoords) return;
    const rideId = await createRideRequest({
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        pickupAddress: pickup,
        dropLat: dropCoords.lat,
        dropLng: dropCoords.lng,
        dropAddress: drop,
        price: 75.00,
        distance: "5.2 km"
    });

    if (!rideId) {
        alert("Ride request failed. Please check your network connection or try again later.");
    }
  };

  const handleCancelRide = async () => {
      if(activeRide) {
          await cancelRide(activeRide.id);
          setPickup(''); setDrop(''); setPickupCoords(null); setDropCoords(null);
      }
  };

  const handleCurrentLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const { latitude, longitude } = position.coords;
                  const coords = { lat: latitude, lng: longitude };
                  setPickupCoords(coords);
                  setMapCenter(coords);
                  setPickup('Current Location');
              },
              (error) => {
                  console.error("Error getting location", error);
                  alert("Could not access location. Please enable permissions.");
              }
          );
      }
  };

    const handleSelectPlace = (place: { description?: string; lat: number; lng: number }, type: 'PICKUP' | 'DROP') => {
        const label = place.description || `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
        if (type === 'PICKUP') {
            setPickup(label);
            setPickupCoords({ lat: place.lat, lng: place.lng });
            setMapCenter({ lat: place.lat, lng: place.lng });
        } else {
            setDrop(label);
            setDropCoords({ lat: place.lat, lng: place.lng });
        }
    };

    const driverInfo = activeRide?.ambulanceId ? ambulances.find(a => a.id === activeRide.ambulanceId) : null;

  // --- Shop Logic ---
  const availableBloodStock = (bloodStock || []).filter(item => !item.isPaused).filter(item => {
      const term = searchTerm.toLowerCase();
      return item.type.toLowerCase().includes(term) || item.hospitalName.toLowerCase().includes(term);
  });
  const cartTotal = (cart || []).reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const wishlistItems = (bloodStock || []).filter(item => wishlist.includes(item.id));

  const handleCheckout = async () => {
      setIsProcessingPayment(true);
      try {
          await placeOrder(cart, cartTotal); // Wait for Supabase insert
          
          setIsProcessingPayment(false);
          setOrderSuccess(true);
          
          setTimeout(() => {
              setOrderSuccess(false);
              setShowCartDrawer(false);
              setActiveTab('ORDERS'); // Switch tab after successful order
          }, 2000);
      } catch (error) {
          setIsProcessingPayment(false);
          console.error(error);
          alert("Failed to place order. Please try again.");
      }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    await updateProfile({ name: pName, address: pAddress, phone: pPhone });
    setIsSubmittingProfile(false);
    alert("Profile updated!");
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 overflow-hidden">
        {/* Navigation Rail */}
        <nav className="order-2 md:order-1 h-20 md:h-full w-full md:w-24 bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center justify-around md:justify-start md:pt-10 z-30 shadow-lg md:shadow-none shrink-0">
            <div className="hidden md:block w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-10 shadow-lg shadow-blue-500/30" />
            <button onClick={() => setActiveTab('RIDE')} className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'RIDE' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Navigation size={28} />
                <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Ambulance</span>
            </button>
            <button onClick={() => setActiveTab('SHOP')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'SHOP' ? 'bg-rose-100 text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Droplet size={28} />
                <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Blood Bank</span>
            </button>
            <button onClick={() => setActiveTab('WISHLIST')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'WISHLIST' ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Heart size={28} />
                 <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Wishlist</span>
            </button>
            <button onClick={() => setActiveTab('ORDERS')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'ORDERS' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Package size={28} />
                 <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Orders</span>
            </button>
             <button onClick={() => setActiveTab('PROFILE')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'PROFILE' ? 'bg-slate-200 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Settings size={28} />
                 <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Profile</span>
            </button>
            <button onClick={logout} className="p-4 rounded-2xl text-slate-400 hover:text-rose-500 md:mt-auto md:mb-8 transition-colors"><LogOut size={28} /></button>
        </nav>

        {/* Content Area */}
        <div className="order-1 md:order-2 flex-1 relative h-[calc(100vh-80px)] md:h-screen overflow-hidden">
            <AnimatePresence mode="wait">
                
                {/* --- RIDE TAB --- */}
                {activeTab === 'RIDE' && (
                    <motion.div key="ride" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative flex flex-col md:block">
                         {/* Map takes full height on desktop, but flex on mobile */}
                         <div className="absolute inset-0 z-0 h-full w-full">
                             <MapComponent center={mapCenter} markers={markers} route={routePath} />
                         </div>

                         {/* Side Panel (Desktop) / Bottom Sheet (Mobile) */}
                         <div className="absolute top-0 left-0 w-full md:w-[420px] h-[55vh] md:h-full bg-white shadow-[0_-10px_60px_rgba(0,0,0,0.15)] md:shadow-2xl z-10 p-6 flex flex-col pointer-events-auto overflow-y-auto rounded-t-[2rem] md:rounded-none">
                            <div className="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" /> {/* Mobile Handle */}
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 md:mt-4">LifeLine</h1>
                            <p className="text-sm text-slate-400 mb-6">Book an ambulance</p>
                            <AnimatePresence mode="wait">
                                {!activeRide && (
                                    <div className="flex-1 flex flex-col relative" ref={dropdownRef}>
                                        <div className="relative mb-6">
                                            {/* Connecting Line */}
                                            <div className="absolute left-[18px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-rose-200 z-0 rounded-full" />
                                            {/* Pickup */}
                                            <div className="relative z-[15] mb-4">
                                                <div className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100 shrink-0" />
                                                    <LocationAutocomplete
                                                        placeholder="Pickup Location"
                                                        value={pickup}
                                                        onChange={setPickup}
                                                        onSelect={(p) => handleSelectPlace(p, 'PICKUP')}
                                                        locationBias={mapCenter}
                                                        trailing={
                                                            <button 
                                                                type="button"
                                                                onClick={handleCurrentLocation} 
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            >
                                                                <LocateFixed size={18} />
                                                            </button>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            {/* Drop */}
                                            <div className="relative z-[5]">
                                                <div className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-300 transition-all">
                                                    <div className="w-3 h-3 rounded-sm bg-rose-500 shrink-0" />
                                                    <LocationAutocomplete
                                                        placeholder="Where to?"
                                                        value={drop}
                                                        onChange={setDrop}
                                                        onSelect={(p) => handleSelectPlace(p, 'DROP')}
                                                        locationBias={pickupCoords || mapCenter}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {pickupCoords && dropCoords && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-auto md:mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 mb-4"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                                                        <AmbulanceIcon size={20} className="text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-slate-900">LifeLine Ambulance</div>
                                                        <div className="text-xs text-slate-500">Fastest response • 2-3 min ETA</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg text-slate-900">₹750</div>
                                                        <div className="text-[10px] text-slate-400">approx</div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                        <Button 
                                            onClick={handleBookRide} 
                                            className={`w-full h-14 text-lg rounded-2xl mt-auto md:mt-0 font-bold transition-all ${
                                                pickupCoords && dropCoords 
                                                    ? 'bg-black text-white hover:bg-slate-800 shadow-lg shadow-black/20' 
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`} 
                                            disabled={!pickupCoords || !dropCoords}
                                        >
                                            {pickupCoords && dropCoords ? 'Confirm Request' : 'Enter pickup & destination'}
                                        </Button>
                                    </div>
                                )}
                                {activeRide && activeRide.status === 'searching' && (
                                    <div className="text-center py-10 md:py-20">
                                        <div className="relative inline-block mb-8">
                                             <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                                             <div className="relative bg-white p-6 rounded-full shadow-xl text-blue-600"><Navigation size={40} className="animate-pulse" /></div>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">Connecting to drivers...</h3>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden"><div className="h-full bg-blue-500 animate-progress w-2/3" /></div>
                                        <Button variant="secondary" onClick={handleCancelRide} className="mt-8 w-full">Cancel Request</Button>
                                    </div>
                                )}
                                {activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_progress') && (
                                    <div className="flex flex-col h-full">
                                        <div className="flex-1">
                                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6 flex items-center gap-4">
                                                <CheckCircle2 size={24} className="text-emerald-600" />
                                                <div>
                                                    <div className="font-bold text-emerald-800">{activeRide.status === 'accepted' ? 'Driver on the way' : 'Ride in Progress'}</div>
                                                    <div className="text-xs text-emerald-600">Track vehicle on map</div>
                                                </div>
                                            </div>
                                            {driverInfo && (
                                                <div className="flex items-center justify-between mb-8">
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-2 overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${driverInfo.driverName || 'Driver'}&background=random`} alt="Driver" /></div>
                                                        <div className="font-bold text-sm">{driverInfo.driverName || 'Nearby Driver'}</div>
                                                        <div className="text-xs text-slate-500">4.9 ★</div>
                                                    </div>
                                                    <div className="text-center flex-1 px-4">
                                                        <div className="text-2xl font-bold text-slate-900">{driverInfo.plateNumber || 'AMB-01'}</div>
                                                        <div className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-1 inline-block mt-1">{driverInfo.type || 'BASIC'}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center"><AmbulanceIcon size={32} className="text-slate-400" /></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-auto space-y-3">
                                            <a href="tel:911" className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-bold py-3 rounded-xl">Contact Driver</a>
                                            {activeRide.status === 'accepted' && <button onClick={handleCancelRide} className="w-full py-3 text-rose-500 font-bold hover:bg-rose-50 rounded-xl">Cancel Ride</button>}
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                         </div>
                    </motion.div>
                )}

                {/* --- SHOP TAB --- */}
                {activeTab === 'SHOP' && (
                    <motion.div key="shop" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
                        <header className="flex flex-col md:flex-row justify-between items-center mb-8 sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-20 gap-4">
                            <div><h2 className="text-3xl font-bold text-slate-800">Blood Marketplace</h2><p className="text-slate-500">Verified inventory from registered hospitals.</p></div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20" placeholder="Search blood type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="relative">
                                    <Button className="pl-4 pr-6 bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 text-white" onClick={() => setShowCartDrawer(true)}>
                                        <ShoppingCart size={20} className="mr-2" /> Cart
                                    </Button>
                                    {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-white text-rose-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-rose-100 shadow-sm">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>}
                                </div>
                            </div>
                        </header>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                            {availableBloodStock.length > 0 ? (
                                availableBloodStock.map((item) => (
                                    <Card key={item.id} className="group hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300 border border-slate-100">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">{item.type}</div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-slate-800">${item.price}</div>
                                                <button onClick={() => toggleWishlist(item.id)} className={`mt-1 p-1 rounded-full transition-colors ${wishlist.includes(item.id) ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:bg-slate-100'}`}><Heart size={16} fill={wishlist.includes(item.id) ? "currentColor" : "none"} /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-6 border-b border-slate-50 pb-4">
                                            <div className="text-sm font-bold text-slate-800 truncate">{item.hospitalName}</div>
                                            <div className="flex justify-between text-xs text-slate-500"><span>Expires:</span><span className="font-medium text-slate-700">{item.expiryDate}</span></div>
                                            <div className="flex justify-between text-xs"><span>Availability:</span><span className="text-emerald-600 font-bold">{item.units} Units</span></div>
                                        </div>
                                        <Button variant="secondary" className="w-full group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-colors" onClick={() => addToCart(item)}>Add to Cart <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" /></Button>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center text-slate-400"><p>No inventory found for "{searchTerm}".</p></div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- WISHLIST TAB --- */}
                {activeTab === 'WISHLIST' && (
                    <motion.div key="wishlist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
                        <header className="mb-8"><h2 className="text-3xl font-bold text-slate-800">My Wishlist</h2><p className="text-slate-500">Saved items for later.</p></header>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {wishlistItems.length > 0 ? (
                                wishlistItems.map((item) => (
                                    <Card key={item.id} className="border border-purple-100 hover:border-purple-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-lg font-bold text-purple-700">{item.type} Blood</div>
                                            <button onClick={() => toggleWishlist(item.id)} className="text-purple-500 hover:bg-purple-50 p-2 rounded-full"><Heart fill="currentColor"/></button>
                                        </div>
                                        <div className="text-sm text-slate-500 mb-4">{item.hospitalName} • ${item.price}</div>
                                        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => addToCart(item)}>Move to Cart</Button>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400"><Heart size={48} className="mb-4 text-slate-200" /><p>Your wishlist is empty.</p></div>
                            )}
                         </div>
                    </motion.div>
                )}

                {/* --- ORDERS TAB --- */}
                {activeTab === 'ORDERS' && (
                    <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
                         <header className="mb-8"><h2 className="text-3xl font-bold text-slate-800">Order History</h2><p className="text-slate-500">Track and view invoices.</p></header>
                        <div className="space-y-4 max-w-4xl">
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <Card key={order.id} className="flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200">
                                        <div className="flex items-start gap-4">
                                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><Package size={24} /></div>
                                            <div>
                                                <div className="text-xs text-slate-500 font-mono mb-1">ID: {order.id.slice(0, 8)}...</div>
                                                <div className="font-bold text-slate-800">{order.items ? order.items.length : 0} Items • ${order.totalAmount}</div>
                                                <div className="text-xs text-slate-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span>
                                            <Button variant="secondary" className="text-xs h-8" onClick={() => setViewingOrder(order)}><FileText size={14} className="mr-2" /> Invoice</Button>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-20 text-slate-400"><p>No past orders found.</p></div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- PROFILE TAB --- */}
                {activeTab === 'PROFILE' && (
                    <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
                         <div className="max-w-xl mx-auto">
                             <Card>
                                <div className="mb-6 border-b border-slate-100 pb-4"><h3 className="text-xl font-bold text-slate-800">My Profile</h3></div>
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                     <div><Label>Full Name</Label><Input value={pName} onChange={e => setPName(e.target.value)} /></div>
                                     <div><Label>Phone Number</Label><Input value={pPhone} onChange={e => setPPhone(e.target.value)} /></div>
                                     <div><Label>Home Address</Label><Input value={pAddress} onChange={e => setPAddress(e.target.value)} /></div>
                                     <div className="pt-4"><Button type="submit" isLoading={isSubmittingProfile} className="w-full bg-rose-600 hover:bg-rose-700">Save Changes</Button></div>
                                </form>
                             </Card>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- CART DRAWER --- */}
            <AnimatePresence>
                {showCartDrawer && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCartDrawer(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg flex items-center gap-2"><ShoppingCart size={20} /> Your Cart</h3>
                                <button onClick={() => setShowCartDrawer(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {cart.length === 0 ? <div className="text-center text-slate-400 mt-20"><ShoppingCart size={48} className="mx-auto mb-4 opacity-50"/>Cart is empty</div> : cart.map(item => (
                                    <div key={item.id} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                        <div className="w-16 h-16 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 font-bold">{item.type}</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800">{item.hospitalName}</div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
                                                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus size={12}/></button>
                                                    <div className="text-sm font-bold w-4 text-center">{item.quantity}</div>
                                                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus size={12}/></button>
                                                </div>
                                                <button onClick={() => removeFromCart(item.id)} className="text-xs text-rose-500 hover:underline">Remove</button>
                                            </div>
                                        </div>
                                        <div className="text-right font-bold text-slate-800">${item.price * item.quantity}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <div className="flex justify-between items-center mb-6"><span className="text-slate-500">Total Amount</span><span className="text-2xl font-bold text-slate-900">${cartTotal}</span></div>
                                {orderSuccess ? <div className="w-full py-4 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold"><CheckCircle2 size={20} className="mr-2" /> Order Placed!</div> : <Button onClick={handleCheckout} isLoading={isProcessingPayment} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-4 text-lg">Checkout Now</Button>}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* --- INVOICE MODAL --- */}
            <AnimatePresence>
                {viewingOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingOrder(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden relative z-10">
                            <div className="p-8 bg-slate-900 text-white flex justify-between items-start">
                                <div><h2 className="text-2xl font-bold mb-1">INVOICE</h2><p className="text-slate-400 text-sm">#{viewingOrder.id.slice(0, 8)}</p></div>
                                <div className="text-right"><h3 className="font-bold text-xl">LifeLine</h3></div>
                            </div>
                            <div className="p-8">
                                <table className="w-full text-left mb-8">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase"><tr><th className="py-3 px-4">Item</th><th className="py-3 px-4">Hospital</th><th className="py-3 px-4 text-center">Qty</th><th className="py-3 px-4 text-right">Amount</th></tr></thead>
                                    <tbody className="text-sm divide-y divide-slate-100">{viewingOrder.items.map((item, i) => (<tr key={i}><td className="py-3 px-4 font-bold">{item.type} Blood</td><td className="py-3 px-4">{item.hospitalName}</td><td className="py-3 px-4 text-center">{item.quantity}</td><td className="py-3 px-4 text-right">${item.price * item.quantity}</td></tr>))}</tbody>
                                </table>
                                <div className="flex justify-end border-t border-slate-200 pt-6"><div className="text-right"><p className="text-slate-500 mb-1">Total</p><p className="text-3xl font-bold text-slate-900">${viewingOrder.totalAmount}</p></div></div>
                            </div>
                            <div className="bg-slate-50 p-4 flex justify-end gap-3"><Button variant="secondary" onClick={() => setViewingOrder(null)}>Close</Button><Button onClick={() => window.print()}>Print</Button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}

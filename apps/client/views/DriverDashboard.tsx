import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MapComponent } from '../components/MapComponent';
import { Card, Button } from '../components/common';
import { RideCard } from '../components/rides';
import { LogOut, Navigation, CheckCircle, Power, Coffee, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RideStatus } from '../types';

export default function DriverDashboard() {
  const {
    logout,
    currentUser,
    ambulances,
    availableRides,
    activeRide,
    acceptRideRequest,
    updateRideStatus,
    updateDriverLocation,
    drivers,
    updateDriver,
  } = useApp();

  // Find current driver record to sync status
  const driverRecord =
    drivers.find((d) => d.id === currentUser?.id) ||
    drivers.find((d) => d.name === currentUser?.name);

  // Status State with localStorage persistence
  const [status, setStatus] = useState<'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE'>(() => {
    const saved = localStorage.getItem('driverStatus');
    if (saved && ['ACTIVE', 'OFF_DUTY', 'ON_LEAVE'].includes(saved)) {
      return saved as 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE';
    }
    return 'OFF_DUTY';
  });

  // Persist status to localStorage
  useEffect(() => {
    localStorage.setItem('driverStatus', status);
  }, [status]);

  // Sync status from DB when loaded
  useEffect(() => {
    if (driverRecord && driverRecord.status) {
      setStatus(driverRecord.status as 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE');
    }
  }, [driverRecord]);

  // Derived online state for tracking logic
  const isOnline = status === 'ACTIVE';

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);

  // Identify the ambulance assigned to this driver
  const myAmbulance =
    ambulances.find((a) => a.driverName === currentUser?.name) ||
    ambulances.find((a) => a.hospitalId === currentUser?.id) ||
    ambulances[0];

  // --- Geolocation Tracking ---
  useEffect(() => {
    if (isOnline && myAmbulance) {
      if ('geolocation' in navigator) {
        watchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, heading } = position.coords;
            const newLoc = { lat: latitude, lng: longitude };
            setLocation(newLoc);

            // Broadcast location to Supabase
            updateDriverLocation(myAmbulance.id, latitude, longitude, heading || 0);
          },
          (error) => console.error('Geo Error', error),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      }
    } else {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isOnline, myAmbulance?.id, updateDriverLocation]);

  // Fallback location for map if geo not ready
  const mapCenter = location || { lat: 28.6139, lng: 77.209 };

  // --- Route Calculation ---
  const [route, setRoute] = useState<{ start: any; end: any } | null>(null);

  useEffect(() => {
    if (activeRide && location) {
      if (activeRide.status === 'accepted') {
        // Route: Driver -> Pickup
        setRoute({
          start: location,
          end: { lat: activeRide.pickupLat, lng: activeRide.pickupLng },
        });
      } else if (activeRide.status === 'in_progress') {
        // Route: Driver (at Pickup) -> Drop
        setRoute({
          start: location,
          end: { lat: activeRide.dropLat, lng: activeRide.dropLng },
        });
      }
    } else {
      setRoute(null);
    }
  }, [activeRide, location]);

  const handleAccept = async (rideId: string) => {
    if (!myAmbulance || !currentUser) return;
    await acceptRideRequest(rideId, currentUser.id, myAmbulance.id);
  };

  const handleRideStatusChange = async (newStatus: RideStatus) => {
    if (activeRide) {
      await updateRideStatus(activeRide.id, newStatus);
    }
  };

  const handleDriverStatusUpdate = async (newStatus: string) => {
    const s = newStatus as 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE';
    setStatus(s);
    if (driverRecord) {
      await updateDriver(driverRecord.id, { status: s });
    }
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-xl text-white p-4 shadow-lg flex justify-between items-center z-20 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-black/40">
            <Activity className="text-black" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">VAYRIN</h1>
            <p className="text-xs text-white/60">
              {myAmbulance ? `Vehicle: ${myAmbulance.plateNumber}` : 'No Vehicle Assigned'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Dropdown */}
          <div className="relative group">
            <select
              value={status}
              onChange={(e) => handleDriverStatusUpdate(e.target.value)}
              className={`appearance-none pl-10 pr-8 py-2 rounded-full font-bold text-sm transition-all outline-none cursor-pointer border border-white/10 ${
                status === 'ACTIVE'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : status === 'ON_LEAVE'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60'
              }`}
            >
              <option value="ACTIVE" className="bg-black text-white">
                ● On Duty
              </option>
              <option value="OFF_DUTY" className="bg-black text-white">
                ○ Off Duty
              </option>
              <option value="ON_LEAVE" className="bg-black text-white">
                ⊘ On Leave
              </option>
            </select>
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                status === 'ACTIVE' ? 'text-black' : 'text-white/70'
              }`}
            >
              {status === 'ACTIVE' ? (
                <CheckCircle size={16} />
              ) : status === 'ON_LEAVE' ? (
                <Coffee size={16} />
              ) : (
                <Power size={16} />
              )}
            </div>
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] ${
                status === 'ACTIVE' ? 'text-black/50' : 'text-white/50'
              }`}
            >
              ▼
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 border border-white/10 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row w-full h-full relative overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative w-full h-full min-h-[400px] lg:min-h-0">
          <MapComponent
            center={mapCenter}
            zoom={15}
            markers={[
              // Me
              ...(location
                ? [{ id: 'me', lat: location.lat, lng: location.lng, type: 'AMBULANCE' as const }]
                : []),
              // Pickup
              ...(activeRide
                ? [
                    {
                      id: 'pickup',
                      lat: activeRide.pickupLat,
                      lng: activeRide.pickupLng,
                      type: 'USER' as const,
                    },
                  ]
                : []),
              // Drop
              ...(activeRide
                ? [
                    {
                      id: 'drop',
                      lat: activeRide.dropLat,
                      lng: activeRide.dropLng,
                      type: 'DESTINATION' as const,
                    },
                  ]
                : []),
            ]}
            route={route}
          />
        </div>

        {/* Bottom Sheet / Sidebar */}
        <div className="flex-none w-full lg:w-[400px] bg-black/70 border-t lg:border-t-0 lg:border-l border-white/10 shadow-2xl shadow-black/40 z-20 flex flex-col h-[40vh] lg:h-full backdrop-blur-xl">
          {/* Stats Header */}
          <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10 shrink-0">
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-white">₹124</div>
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Earnings</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-white">4.9</div>
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Rating</div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-black/30">
            {!isOnline ? (
              <div className="h-full flex flex-col items-center justify-center text-white/60">
                {status === 'ON_LEAVE' ? (
                  <Coffee size={48} className="mb-4 opacity-50 text-amber-500" />
                ) : (
                  <Power size={48} className="mb-4 opacity-50" />
                )}
                <p className="font-medium text-lg">
                  {status === 'ON_LEAVE' ? 'On Break' : 'You are Offline'}
                </p>
                <p className="text-sm">
                  Set your status to <b>On Duty</b> to receive requests
                </p>
              </div>
            ) : (
              <>
                {/* Active Ride UI */}
                {activeRide ? (
                  <Card className="border-l-4 border-white/20 shadow-lg bg-white/5 border border-white/10 text-white">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="px-2 py-1 bg-white/10 text-white text-xs font-bold rounded uppercase border border-white/10">
                          {activeRide.status}
                        </span>
                        <span className="font-mono text-white/50 text-xs">
                          #{activeRide.id.slice(0, 6)}
                        </span>
                      </div>
                      <div className="space-y-4 relative">
                        <div className="absolute left-[7px] top-[24px] bottom-[24px] w-0.5 bg-white/10" />
                        <div className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow mt-1 relative z-10" />
                          <div>
                            <div className="text-xs text-white/50 font-bold uppercase">Pickup</div>
                            <div className="font-bold text-white text-sm">
                              {activeRide.pickupAddress}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-none bg-rose-500 border-2 border-white shadow mt-1 relative z-10" />
                          <div>
                            <div className="text-xs text-white/50 font-bold uppercase">Dropoff</div>
                            <div className="font-bold text-white text-sm">
                              {activeRide.dropAddress}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      {activeRide.status === 'accepted' && (
                        <Button
                          onClick={() => handleRideStatusChange('in_progress')}
                          className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                        >
                          Arrived at Pickup
                        </Button>
                      )}
                      {activeRide.status === 'in_progress' && (
                        <Button
                          onClick={() => handleRideStatusChange('completed')}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
                        >
                          Complete Trip
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  /* Incoming Requests List */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-white/60 uppercase tracking-wide">
                        Incoming Requests ({availableRides.length})
                      </h3>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/10 px-2 py-1 rounded-full border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                      </span>
                    </div>

                    {availableRides.length === 0 ? (
                      <div className="py-10 text-center border-2 border-dashed border-white/15 rounded-xl bg-white/5">
                        <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full mx-auto mb-3" />
                        <p className="text-sm text-white/60 font-medium">Scanning area...</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {availableRides.map((req) => (
                          <motion.div
                            key={req.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                          >
                            <RideCard
                              ride={req}
                              onAccept={handleAccept}
                              isDriverView={true}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

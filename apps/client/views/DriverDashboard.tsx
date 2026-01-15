import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MapComponent } from '../components/MapComponent';
import { Card, Button } from '../components/common';
import { RideCard } from '../components/rides';
import { LogOut, Navigation, CheckCircle, Power, Coffee, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RideStatus } from '../types';
import { directionsBasic } from '../lib/olaApi';

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

  // Earnings state with localStorage persistence
  const [totalEarnings, setTotalEarnings] = useState<number>(() => {
    const saved = localStorage.getItem('driverEarnings');
    return saved ? parseFloat(saved) : 0;
  });
  const [completedTrips, setCompletedTrips] = useState<number>(() => {
    const saved = localStorage.getItem('driverTrips');
    return saved ? parseInt(saved) : 0;
  });
  const prevRideIdRef = useRef<string | null>(null);

  // Track ride completion for earnings
  useEffect(() => {
    const prevId = prevRideIdRef.current;
    const currId = activeRide?.id ?? null;
    
    if (currId) {
      prevRideIdRef.current = currId;
    } else if (prevId && !currId) {
      // Ride just ended - check localStorage for last completed ride price
      const lastPrice = localStorage.getItem('lastCompletedRidePrice');
      if (lastPrice) {
        const price = parseFloat(lastPrice);
        setTotalEarnings(prev => {
          const newTotal = prev + price;
          localStorage.setItem('driverEarnings', String(newTotal));
          return newTotal;
        });
        setCompletedTrips(prev => {
          const newCount = prev + 1;
          localStorage.setItem('driverTrips', String(newCount));
          return newCount;
        });
        localStorage.removeItem('lastCompletedRidePrice');
      }
      prevRideIdRef.current = null;
    }
  }, [activeRide?.id]);

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

  // Identify the ambulance assigned to this driver (check by driver ID assignment)
  const myAmbulance = 
    // First check if driver is primary driver for any ambulance
    ambulances.find((a) => a.primaryDriverId === currentUser?.id) ||
    // Then check if driver is alternate driver for any ambulance
    ambulances.find((a) => a.alternateDriverId === currentUser?.id) ||
    // Fallback: check by driver record ID
    ambulances.find((a) => a.primaryDriverId === driverRecord?.id || a.alternateDriverId === driverRecord?.id) ||
    // Legacy fallback: match by name
    ambulances.find((a) => a.driverName === currentUser?.name) ||
    ambulances.find((a) => a.hospitalId === currentUser?.id) ||
    null;

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

  // Fallback location: use ambulance's stored location from DB, or pickup if available
  const fallbackLocation = myAmbulance?.location || (activeRide ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng } : null);
  const effectiveLocation = location || fallbackLocation;

  // --- Simulation States ---
  const [simulatedLocation, setSimulatedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | null>(null);
  const [remainingRoute, setRemainingRoute] = useState<[number, number][] | null>(null);
  const [simPhase, setSimPhase] = useState<'to_pickup' | 'to_drop' | null>(null);
  const [simEtaSeconds, setSimEtaSeconds] = useState<number>(60); // ETA-based timing
  const [simStartTime, setSimStartTime] = useState<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const mapCenter = simulatedLocation || effectiveLocation || { lat: 28.6139, lng: 77.209 };

  // Helper: Get position on polyline
  const getPositionOnPolyline = (coords: [number, number][], progress: number): {lat: number, lng: number} => {
    if (!coords || coords.length === 0) return { lat: 0, lng: 0 };
    if (coords.length === 1) return { lat: coords[0][1], lng: coords[0][0] };
    
    let totalLength = 0;
    const segmentLengths: number[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const dx = coords[i+1][0] - coords[i][0];
      const dy = coords[i+1][1] - coords[i][1];
      segmentLengths.push(Math.sqrt(dx*dx + dy*dy));
      totalLength += segmentLengths[i];
    }
    if (totalLength === 0) return { lat: coords[0][1], lng: coords[0][0] };
    
    const targetDist = progress * totalLength;
    let traveled = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
      if (traveled + segmentLengths[i] >= targetDist) {
        const segProg = (targetDist - traveled) / segmentLengths[i];
        return {
          lng: coords[i][0] + (coords[i+1][0] - coords[i][0]) * segProg,
          lat: coords[i][1] + (coords[i+1][1] - coords[i][1]) * segProg,
        };
      }
      traveled += segmentLengths[i];
    }
    return { lat: coords[coords.length-1][1], lng: coords[coords.length-1][0] };
  };

  // Fetch route polyline when ride starts
  useEffect(() => {
    if (!activeRide) {
      setRoutePolyline(null);
      setRemainingRoute(null);
      setSimulatedLocation(null);
      setSimPhase(null);
      setSimStartTime(null);
      return;
    }

    const fetchRoute = async () => {
      let start: {lat: number, lng: number};
      let end: {lat: number, lng: number};
      
      if (activeRide.status === 'accepted') {
        start = effectiveLocation || { lat: activeRide.pickupLat - 0.015, lng: activeRide.pickupLng - 0.015 };
        end = { lat: activeRide.pickupLat, lng: activeRide.pickupLng };
        setSimPhase('to_pickup');
      } else if (activeRide.status === 'in_progress') {
        start = { lat: activeRide.pickupLat, lng: activeRide.pickupLng };
        end = { lat: activeRide.dropLat, lng: activeRide.dropLng };
        setSimPhase('to_drop');
      } else {
        return;
      }

      try {
        const routes = await directionsBasic({ origin: start, destination: end, overview: 'full' });
        if (routes.length && routes[0].geometry) {
          // Decode polyline
          const decoded = decodePolyline(routes[0].geometry);
          setRoutePolyline(decoded);
          setRemainingRoute(decoded);
          setSimulatedLocation(start);
          setSimStartTime(Date.now());
          
          // Extract ETA from route duration (in seconds) - add 20% buffer for realism
          const durationSec = routes[0].duration_seconds || 120;
          setSimEtaSeconds(durationSec * 1.2);
        }
      } catch (e) {
        console.error('Failed to fetch route:', e);
      }
    };

    fetchRoute();
  }, [activeRide?.id, activeRide?.status]);

  // Decode polyline helper
  const decodePolyline = (encoded: string): [number, number][] => {
    if (typeof encoded !== 'string') return [];
    const coords: [number, number][] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      coords.push([lng / 1e5, lat / 1e5]);
    }
    return coords;
  };

  // Simulation movement loop - ETA-based timing like patient portal
  useEffect(() => {
    if (!routePolyline || routePolyline.length < 2 || !simPhase || !simStartTime) return;

    simIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - simStartTime;
      const totalMs = Math.max(simEtaSeconds, 1) * 1000;
      const rawProgress = Math.min(elapsedMs / totalMs, 1);
      
      // Easing for realistic movement (ease-in-out)
      const easedProgress = rawProgress < 0.5
        ? 2 * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;
      
      const pos = getPositionOnPolyline(routePolyline, easedProgress);
      setSimulatedLocation(pos);
      
      // Update remaining route (shrinking polyline)
      const remainingIdx = Math.floor(easedProgress * (routePolyline.length - 1));
      const remaining: [number, number][] = [[pos.lng, pos.lat], ...routePolyline.slice(remainingIdx + 1)];
      setRemainingRoute(remaining);
      
      // Throttled Supabase location update (every 3 seconds)
      if (myAmbulance && Math.floor(elapsedMs / 3000) !== Math.floor((elapsedMs - 100) / 3000)) {
        updateDriverLocation(myAmbulance.id, pos.lat, pos.lng, 0).catch(() => {});
      }
      
      // Stop when arrived
      if (rawProgress >= 1) {
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      }
    }, 100);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [routePolyline, simPhase, simStartTime, simEtaSeconds, myAmbulance?.id]);

  // --- Route Calculation ---
  const [route, setRoute] = useState<{ start: any; end: any } | null>(null);

  useEffect(() => {
    if (activeRide && effectiveLocation) {
      if (activeRide.status === 'accepted') {
        // Route: Driver -> Pickup
        setRoute({
          start: simulatedLocation || effectiveLocation,
          end: { lat: activeRide.pickupLat, lng: activeRide.pickupLng },
        });
      } else if (activeRide.status === 'in_progress') {
        // Route: Driver (simulated location) -> Drop
        setRoute({
          start: simulatedLocation || { lat: activeRide.pickupLat, lng: activeRide.pickupLng },
          end: { lat: activeRide.dropLat, lng: activeRide.dropLng },
        });
      }
    } else {
      setRoute(null);
    }
  }, [activeRide, effectiveLocation, simulatedLocation]);

  const handleAccept = async (rideId: string) => {
    console.log('[handleAccept] rideId:', rideId, 'myAmbulance:', myAmbulance, 'currentUser:', currentUser);
    if (!myAmbulance) {
      alert('No ambulance assigned to you. Please contact admin to assign an ambulance.');
      return;
    }
    if (!currentUser) {
      alert('Not logged in.');
      return;
    }
    await acceptRideRequest(rideId, currentUser.id, myAmbulance.id);
  };

  const handleRideStatusChange = async (newStatus: RideStatus) => {
    if (activeRide) {
      // Save price before completing for earnings calculation
      if (newStatus === 'completed' && activeRide.price) {
        localStorage.setItem('lastCompletedRidePrice', String(activeRide.price));
      }
      
      // Reset simulation when moving to in_progress
      if (newStatus === 'in_progress') {
        setSimStartTime(null);
        setRoutePolyline(null);
        setRemainingRoute(null);
      }
      
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
              // Me (Driver's ambulance) - use simulated location if available
              ...((simulatedLocation || effectiveLocation)
                ? [{ 
                    id: 'me', 
                    lat: (simulatedLocation || effectiveLocation)!.lat, 
                    lng: (simulatedLocation || effectiveLocation)!.lng, 
                    type: 'AMBULANCE' as const 
                  }]
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
            liveRouteCoords={remainingRoute}
          />
        </div>

        {/* Bottom Sheet / Sidebar */}
        <div className="flex-none w-full lg:w-[400px] bg-black/70 border-t lg:border-t-0 lg:border-l border-white/10 shadow-2xl shadow-black/40 z-20 flex flex-col h-[40vh] lg:h-full backdrop-blur-xl">
          {/* Stats Header */}
          <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10 shrink-0">
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-white">₹{totalEarnings}</div>
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Earnings</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-black text-white">{completedTrips}</div>
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Trips</div>
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

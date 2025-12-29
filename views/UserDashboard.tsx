
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MapComponent } from '../components/MapComponent';
import { Card, Button, Input, Label } from '../components/ui';
import { motion as motionOriginal, AnimatePresence } from 'framer-motion';
import { Navigation, Droplet, ShoppingCart, LogOut, ArrowRight, CheckCircle2, Heart, Trash, CreditCard, X, AlertTriangle, FileText, Package, Clock, Calendar, Settings, Search, MapPin, Ambulance as AmbulanceIcon, LocateFixed, Minus, Plus, Activity } from 'lucide-react';
import { Ambulance, AmbulanceStatus, Order } from '../types';
import LocationAutocomplete from '../components/LocationAutocomplete';

const motion = motionOriginal as any;

export default function UserDashboard() {
    const { 
        logout, currentUser, ambulances, updateProfile,
        activeRide, createRideRequest, cancelRide, updateRideStatus,
        bloodStock, cart, addToCart, removeFromCart, updateCartQuantity, placeOrder,
        wishlist, toggleWishlist, orders,
        updateDriverLocation
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
    const [routeMetrics, setRouteMetrics] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
    const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);
    const [routePolylineCoords, setRoutePolylineCoords] = useState<[number, number][] | null>(null); // [lng, lat] from route API
  
  // Fake Ambulance Logic
  const [simulatedAmbLocation, setSimulatedAmbLocation] = useState<{lat: number, lng: number} | null>(null);
  const [ambulanceBearing, setAmbulanceBearing] = useState<number>(0); // Direction ambulance is facing
  const [ambAnimationStartTime, setAmbAnimationStartTime] = useState<number | null>(null);
  const [ambStartLocation, setAmbStartLocation] = useState<{lat: number, lng: number} | null>(null);
  const [ambTargetLocation, setAmbTargetLocation] = useState<{lat: number, lng: number} | null>(null);
  const [ambEtaSeconds, setAmbEtaSeconds] = useState<number>(120); // default 2 min
    const [currentPhase, setCurrentPhase] = useState<'to_pickup' | 'arriving' | 'waiting_at_pickup' | 'to_drop' | 'completing' | null>(null);
  const [activeRouteCoords, setActiveRouteCoords] = useState<[number, number][] | null>(null); // The polyline coords for current phase
  const [waitingCountdown, setWaitingCountdown] = useState<number>(0); // Countdown timer in seconds
  const [arrivingCountdown, setArrivingCountdown] = useState<number>(0); // 50 sec countdown before waiting
    const lastSupabaseUpdateRef = useRef<{ timestamp: number; lat: number; lng: number } | null>(null);
        const pendingMoveRef = useRef<{ phase: 'to_pickup' | 'to_drop'; requestedAt: number } | null>(null);
    const prevRideIdRef = useRef<string | null>(null);
  
  // Autocomplete
    const dropdownRef = useRef<HTMLDivElement>(null);

  // Load existing ride state
  useEffect(() => {
      if (activeRide) {
          setPickup(activeRide.pickupAddress);
          setDrop(activeRide.dropAddress);
          setPickupCoords({ lat: activeRide.pickupLat, lng: activeRide.pickupLng });
          setDropCoords({ lat: activeRide.dropLat, lng: activeRide.dropLng });
          setSelectedAmbulanceId(activeRide.ambulanceId || null);
      }
  }, [activeRide]);

    // When a ride ends (activeRide becomes null), reset to the normal request state
    // like cancel flow (image 2)
    useEffect(() => {
        const prev = prevRideIdRef.current;
        const curr = activeRide?.id ?? null;
        if (curr) {
            prevRideIdRef.current = curr;
            return;
        }
        // curr is null
        if (!prev) return; // first load

        prevRideIdRef.current = null;
        setPickup('');
        setDrop('');
        setPickupCoords(null);
        setDropCoords(null);
        setSelectedAmbulanceId(null);
        setRouteMetrics(null);
        setRoutePolylineCoords(null);
        setRoutePath(null);
    }, [activeRide?.id]);

  // FAKE AMBULANCE SIMULATION - Follows actual route polyline like Uber/Ola
  // Phase 1: Driver moves from DB location to Pickup (along route)
  // Phase 2: Driver moves from Pickup to Drop (along route)
  
  // Helper: Calculate bearing between two points
  const calculateBearing = (from: {lat: number, lng: number}, to: {lat: number, lng: number}): number => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;
    
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    
    const x = Math.sin(dLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    return (toDeg(Math.atan2(x, y)) + 360) % 360;
  };
  
  // Helper: Get position along polyline at a given progress (0-1)
  const getPositionOnPolyline = (coords: [number, number][], progress: number): {lat: number, lng: number, bearing: number} => {
    if (!coords || coords.length === 0) return { lat: 0, lng: 0, bearing: 0 };
    if (coords.length === 1) return { lat: coords[0][1], lng: coords[0][0], bearing: 0 };
    
    // Calculate total length
    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    for (let i = 0; i < coords.length - 1; i++) {
      const dx = coords[i+1][0] - coords[i][0];
      const dy = coords[i+1][1] - coords[i][1];
      const len = Math.sqrt(dx*dx + dy*dy);
      segmentLengths.push(len);
      totalLength += len;
    }
    
    if (totalLength === 0) return { lat: coords[0][1], lng: coords[0][0], bearing: 0 };
    
    // Find position at target distance
    const targetDistance = progress * totalLength;
    let traveled = 0;
    
    for (let i = 0; i < segmentLengths.length; i++) {
      if (traveled + segmentLengths[i] >= targetDistance) {
        // We're on this segment
        const segmentProgress = (targetDistance - traveled) / segmentLengths[i];
        const lng = coords[i][0] + (coords[i+1][0] - coords[i][0]) * segmentProgress;
        const lat = coords[i][1] + (coords[i+1][1] - coords[i][1]) * segmentProgress;
        
        // Calculate bearing for this segment
        const bearing = calculateBearing(
          { lat: coords[i][1], lng: coords[i][0] },
          { lat: coords[i+1][1], lng: coords[i+1][0] }
        );
        
        return { lat, lng, bearing };
      }
      traveled += segmentLengths[i];
    }
    
    // At the end
    const lastIdx = coords.length - 1;
    const bearing = calculateBearing(
      { lat: coords[lastIdx-1][1], lng: coords[lastIdx-1][0] },
      { lat: coords[lastIdx][1], lng: coords[lastIdx][0] }
    );
    return { lat: coords[lastIdx][1], lng: coords[lastIdx][0], bearing };
  };
  
  // Helper: Calculate distance between two points in meters (Haversine formula)
  const getDistanceMeters = (from: {lat: number, lng: number}, to: {lat: number, lng: number}): number => {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

    const normalizeRoutePolyline = (
        coords: [number, number][],
        expectedStart: { lat: number; lng: number },
        expectedEnd: { lat: number; lng: number },
        maxEndpointMismatchMeters = 150
    ): [number, number][] | null => {
        if (!coords || coords.length < 2) return null;
        const first = { lat: coords[0][1], lng: coords[0][0] };
        const last = { lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] };

        const dFirstStart = getDistanceMeters(first, expectedStart);
        const dLastEnd = getDistanceMeters(last, expectedEnd);
        const dFirstEnd = getDistanceMeters(first, expectedEnd);
        const dLastStart = getDistanceMeters(last, expectedStart);

        // Accept if (first≈start AND last≈end)
        if (dFirstStart <= maxEndpointMismatchMeters && dLastEnd <= maxEndpointMismatchMeters) {
            return coords;
        }

        // Accept reversed if (first≈end AND last≈start)
        if (dFirstEnd <= maxEndpointMismatchMeters && dLastStart <= maxEndpointMismatchMeters) {
            return [...coords].reverse();
        }

        // Mismatch: likely stale route (e.g., pickup→drop when we need driver→pickup)
        return null;
    };

    // ----- Ride simulation (movement + timers) -----
    // IMPORTANT: timers are in separate effects so phase transitions cannot be skipped
    // due to React async state updates.

    // Reset all simulation state when ride disappears
    useEffect(() => {
        if (activeRide) return;
        setSimulatedAmbLocation(null);
        setAmbStartLocation(null);
        setAmbTargetLocation(null);
        setAmbAnimationStartTime(null);
        setCurrentPhase(null);
        setActiveRouteCoords(null);
        setAmbulanceBearing(0);
        setWaitingCountdown(0);
        setArrivingCountdown(0);
        lastSupabaseUpdateRef.current = null;
        pendingMoveRef.current = null;
    }, [activeRide]);

    // Initialize Phase 1: To Pickup (when ride is accepted)
    useEffect(() => {
        if (!activeRide || !pickupCoords) return;
        if (activeRide.status !== 'accepted') return;
        if (currentPhase) return;

        const assignedAmbulance = activeRide.ambulanceId
            ? ambulances.find(a => a.id === activeRide.ambulanceId)
            : null;
        const dbLocation = assignedAmbulance?.location;
        if (!dbLocation) return;

        setActiveRouteCoords(null); // wait for map to provide fresh route coords
        setAmbStartLocation(dbLocation);
        setSimulatedAmbLocation(dbLocation);
        setAmbTargetLocation(pickupCoords);
        setAmbAnimationStartTime(null);
        setArrivingCountdown(0);
        setWaitingCountdown(0);
        setCurrentPhase('to_pickup');
        pendingMoveRef.current = { phase: 'to_pickup', requestedAt: Date.now() };

        // Reasonable speed: 1.2x the ETA (capped)
        const etaMinutes = Math.min(routeMetrics?.durationMinutes || 2, 5);
        setAmbEtaSeconds(etaMinutes * 60 * 1.2);
    }, [activeRide?.id, activeRide?.status, activeRide?.ambulanceId, pickupCoords, ambulances, currentPhase, routeMetrics?.durationMinutes]);

    // Start movement only after route polyline is ready (or after a short fallback timeout)
    useEffect(() => {
        if (!activeRide) return;
        if (currentPhase !== 'to_pickup' && currentPhase !== 'to_drop') return;
        if (ambAnimationStartTime) return;

        const pending = pendingMoveRef.current;
        if (!pending || pending.phase !== currentPhase) return;

        const waitedMs = Date.now() - pending.requestedAt;
        const routeReady = !!activeRouteCoords && activeRouteCoords.length > 1;

        // Prefer to wait for route so polyline doesn't lag behind movement
        if (routeReady || waitedMs >= 1500) {
            setAmbAnimationStartTime(Date.now());
        }
    }, [activeRide?.id, currentPhase, ambAnimationStartTime, activeRouteCoords]);

    // When we are in a moving phase and we receive polyline coords, lock them in
    // for the current phase so the simulation follows a stable route.
    useEffect(() => {
        if (!routePolylineCoords || routePolylineCoords.length < 2) return;
        if (activeRouteCoords) return;
        if (currentPhase !== 'to_pickup' && currentPhase !== 'to_drop') return;

        const start = currentPhase === 'to_pickup'
            ? (ambStartLocation || simulatedAmbLocation)
            : pickupCoords;
        const end = currentPhase === 'to_pickup'
            ? pickupCoords
            : dropCoords;

        if (!start || !end) return;

        const normalized = normalizeRoutePolyline(routePolylineCoords, start, end);
        if (!normalized) return;
        setActiveRouteCoords(normalized);
    }, [routePolylineCoords, activeRouteCoords, currentPhase, ambStartLocation, simulatedAmbLocation, pickupCoords, dropCoords]);

    // Movement loop (to_pickup / to_drop)
    useEffect(() => {
        if (!activeRide) return;
        if (!ambAnimationStartTime) return;
        if (currentPhase !== 'to_pickup' && currentPhase !== 'to_drop') return;

        const intervalId = setInterval(() => {
            const elapsedMs = Date.now() - ambAnimationStartTime;
            const totalMs = Math.max(ambEtaSeconds, 1) * 1000;
            const rawProgress = Math.min(elapsedMs / totalMs, 1);

            const easedProgress = rawProgress < 0.5
                ? 2 * rawProgress * rawProgress
                : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

            const routeToFollow = activeRouteCoords;
            let newLocation: { lat: number; lng: number } | null = null;
            let newBearing = ambulanceBearing;

            if (routeToFollow && routeToFollow.length > 1) {
                const pos = getPositionOnPolyline(routeToFollow, easedProgress);
                newLocation = { lat: pos.lat, lng: pos.lng };
                newBearing = pos.bearing;
            } else if (ambStartLocation && ambTargetLocation) {
                const newLat = ambStartLocation.lat + (ambTargetLocation.lat - ambStartLocation.lat) * easedProgress;
                const newLng = ambStartLocation.lng + (ambTargetLocation.lng - ambStartLocation.lng) * easedProgress;
                newLocation = { lat: newLat, lng: newLng };
                newBearing = calculateBearing(ambStartLocation, ambTargetLocation);
            }

            if (!newLocation) return;

            setSimulatedAmbLocation(newLocation);
            setAmbulanceBearing(newBearing);

            // Throttled Supabase live location update
            if (activeRide.ambulanceId) {
                const now = Date.now();
                const last = lastSupabaseUpdateRef.current;
                const timeSinceLast = last ? now - last.timestamp : Infinity;
                const distSinceLast = last
                    ? getDistanceMeters({ lat: last.lat, lng: last.lng }, newLocation)
                    : Infinity;

                if (timeSinceLast > 3000 || distSinceLast > 25) {
                    lastSupabaseUpdateRef.current = { timestamp: now, lat: newLocation.lat, lng: newLocation.lng };
                    updateDriverLocation(activeRide.ambulanceId, newLocation.lat, newLocation.lng, newBearing)
                        .catch(err => console.warn('Failed to update driver location in Supabase', err));
                }
            }

            // Arrive at pickup => switch to arriving phase
            if (currentPhase === 'to_pickup' && pickupCoords) {
                const distanceToPickup = getDistanceMeters(newLocation, pickupCoords);
                if (distanceToPickup <= 5 || rawProgress >= 1) {
                    clearInterval(intervalId);
                    setSimulatedAmbLocation(pickupCoords);
                    setAmbAnimationStartTime(null);
                    setActiveRouteCoords(null);
                    setCurrentPhase('arriving');
                    setArrivingCountdown(50);
                    pendingMoveRef.current = null;
                    return;
                }
            }

            // Arrive at drop => wait 5 seconds then complete ride
            if (currentPhase === 'to_drop' && dropCoords) {
                const distanceToDrop = getDistanceMeters(newLocation, dropCoords);
                if (distanceToDrop <= 5 || rawProgress >= 1) {
                    clearInterval(intervalId);
                    setSimulatedAmbLocation(dropCoords);
                    setAmbAnimationStartTime(null);
                    setActiveRouteCoords(null);
                    setCurrentPhase('completing');
                    pendingMoveRef.current = null;
                    return;
                }
            }

            // Finish drop movement handled above (distance/progress)
        }, 100);

        return () => clearInterval(intervalId);
    }, [activeRide?.id, activeRide?.ambulanceId, ambAnimationStartTime, ambEtaSeconds, currentPhase, activeRouteCoords, pickupCoords, ambStartLocation, ambTargetLocation, ambulanceBearing, updateDriverLocation]);

    // After reaching drop, wait 5 seconds then complete ride and reset UI (via context)
    useEffect(() => {
        if (!activeRide) return;
        if (currentPhase !== 'completing') return;
        const rideId = activeRide.id;
        const timerId = setTimeout(() => {
            updateRideStatus(rideId, 'completed').catch(err => console.warn('Failed to complete ride', err));
        }, 5000);
        return () => clearTimeout(timerId);
    }, [activeRide?.id, currentPhase, updateRideStatus]);

    // Arriving countdown tick
    useEffect(() => {
        if (currentPhase !== 'arriving') return;
        if (arrivingCountdown <= 0) return;
        const timerId = setInterval(() => {
            setArrivingCountdown(prev => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timerId);
    }, [currentPhase, arrivingCountdown]);

    // Arriving -> Waiting transition
    useEffect(() => {
        if (currentPhase !== 'arriving') return;
        if (arrivingCountdown !== 0) return;
        setCurrentPhase('waiting_at_pickup');
        setWaitingCountdown(120);
    }, [currentPhase, arrivingCountdown]);

    // Waiting countdown tick
    useEffect(() => {
        if (currentPhase !== 'waiting_at_pickup') return;
        if (waitingCountdown <= 0) return;
        const timerId = setInterval(() => {
            setWaitingCountdown(prev => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timerId);
    }, [currentPhase, waitingCountdown]);

    // Waiting -> To drop transition
    useEffect(() => {
        if (!activeRide || !pickupCoords || !dropCoords) return;
        if (currentPhase !== 'waiting_at_pickup') return;
        if (waitingCountdown !== 0) return;

        // Reset for drop movement
        setActiveRouteCoords(null); // map will provide pickup->drop route
        setAmbStartLocation(pickupCoords);
        setSimulatedAmbLocation(pickupCoords);
        setAmbTargetLocation(dropCoords);
        setAmbAnimationStartTime(Date.now());
        setCurrentPhase('to_drop');

        const etaMinutes = routeMetrics?.durationMinutes || 8;
        setAmbEtaSeconds(etaMinutes * 60 * 1.5);
    }, [activeRide?.id, currentPhase, waitingCountdown, pickupCoords, dropCoords, routeMetrics?.durationMinutes]);

  // Dynamic Markers & Routing Logic
  const [markers, setMarkers] = useState<Array<{id: string, lat: number, lng: number, type: 'USER' | 'AMBULANCE' | 'DESTINATION', bearing?: number}>>([]);

    // Route shown on the map: keep it stable per phase (do NOT re-route every 100ms)
    useEffect(() => {
        // No active ride: show pickup -> drop route only
        if (!activeRide) {
            if (pickupCoords && dropCoords) setRoutePath({ start: pickupCoords, end: dropCoords });
            else setRoutePath(null);
            return;
        }

        if (!pickupCoords) {
            setRoutePath(null);
            return;
        }

        const phaseToPickup =
            activeRide.status === 'accepted' &&
            (currentPhase === 'to_pickup' || currentPhase === 'arriving' || currentPhase === 'waiting_at_pickup' || !currentPhase);

        if (phaseToPickup) {
            // FIXED route: start at initial ambulance DB location (not moving location)
            const start = ambStartLocation || (activeRide.ambulanceId ? ambulances.find(a => a.id === activeRide.ambulanceId)?.location : null);
            if (start) setRoutePath({ start, end: pickupCoords });
            else setRoutePath({ start: pickupCoords, end: pickupCoords });
            return;
        }

        if (dropCoords) {
            // FIXED route: pickup -> drop
            setRoutePath({ start: pickupCoords, end: dropCoords });
        } else {
            setRoutePath(null);
        }
    }, [activeRide?.id, activeRide?.status, currentPhase, pickupCoords, dropCoords, ambStartLocation, activeRide?.ambulanceId, ambulances]);

  useEffect(() => {
    const newMarkers: Array<{id: string, lat: number, lng: number, type: 'USER' | 'AMBULANCE' | 'DESTINATION', bearing?: number}> = [];
    
    // 1. User Pickup
    if (pickupCoords) {
        newMarkers.push({ id: 'pickup', lat: pickupCoords.lat, lng: pickupCoords.lng, type: 'USER' });
    }

    // 2. Dropoff
    if (dropCoords) {
        newMarkers.push({ id: 'drop', lat: dropCoords.lat, lng: dropCoords.lng, type: 'DESTINATION' });
    }

    // 3. Ambulance Tracking (only during active ride)
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'in_progress') && simulatedAmbLocation) {
        newMarkers.push({ 
            id: 'ambulance_active', 
            lat: simulatedAmbLocation.lat, 
            lng: simulatedAmbLocation.lng, 
            type: 'AMBULANCE',
            bearing: ambulanceBearing 
        });
    } else if (!activeRide) {
                // routePath handled by dedicated effect
    }

    setMarkers(newMarkers);
    }, [pickupCoords, dropCoords, activeRide, simulatedAmbLocation, ambulanceBearing]);

    const handleBookRide = async () => {
        if (!pickupCoords || !dropCoords || !selectedAmbulanceId) return;

        const selectedAmbulance = ambulances.find(a => a.id === selectedAmbulanceId);
        const distanceKm = routeMetrics?.distanceKm ?? 5.2;
        const durationMin = routeMetrics?.durationMinutes ?? 8;
        const base = selectedAmbulance?.baseCharge ?? 75;
        const perKm = selectedAmbulance?.pricePerKm ?? 12;
        const fare = Math.max(base, base + Math.max(distanceKm - 1, 0) * perKm);

        const rideId = await createRideRequest({
                pickupLat: pickupCoords.lat,
                pickupLng: pickupCoords.lng,
                pickupAddress: pickup,
                dropLat: dropCoords.lat,
                dropLng: dropCoords.lng,
                dropAddress: drop,
                price: Number(fare.toFixed(2)),
                distance: `${distanceKm.toFixed(1)} km`,
                duration: `${durationMin} min`,
                ambulanceId: selectedAmbulanceId
        });

        if (!rideId) {
                alert("Ride request failed. Please check your network connection or try again later.");
        }
    };

  const handleCancelRide = async () => {
      if(activeRide) {
          await cancelRide(activeRide.id);
          setPickup(''); setDrop(''); setPickupCoords(null); setDropCoords(null); setSelectedAmbulanceId(null); setRouteMetrics(null);
          setSimulatedAmbLocation(null); setAmbStartLocation(null); setAmbTargetLocation(null); setAmbAnimationStartTime(null); setCurrentPhase(null);
          setRoutePolylineCoords(null); setActiveRouteCoords(null); setAmbulanceBearing(0); setWaitingCountdown(0); setArrivingCountdown(0);
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
                  setRouteMetrics(null);
              },
              (error) => {
                  console.error("Error getting location", error);
                  alert("Could not access location. Please enable permissions.");
              }
          );
      }
  };

  // Auto-set pickup to current location on first load (like Uber)
  useEffect(() => {
      if (!pickupCoords && !pickup && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const { latitude, longitude } = position.coords;
                  const coords = { lat: latitude, lng: longitude };
                  setPickupCoords(coords);
                  setMapCenter(coords);
                  setPickup('Current Location');
                  setRouteMetrics(null);
              },
              () => {/* silent fail */},
              { enableHighAccuracy: true, timeout: 5000 }
          );
      }
  }, [pickupCoords, pickup]);

    const handleSelectPlace = (place: { description?: string; lat: number; lng: number }, type: 'PICKUP' | 'DROP') => {
        const label = place.description || `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
        if (type === 'PICKUP') {
            setPickup(label);
            setPickupCoords({ lat: place.lat, lng: place.lng });
            setMapCenter({ lat: place.lat, lng: place.lng });
        } else {
            setDrop(label);
            setDropCoords({ lat: place.lat, lng: place.lng });
            setMapCenter({ lat: place.lat, lng: place.lng });
        }
        setRouteMetrics(null);
    };

    const driverInfo = activeRide?.ambulanceId ? ambulances.find(a => a.id === activeRide.ambulanceId) : null;

    const availableAmbulances = ambulances.filter(a => (a.status || '').toUpperCase() === 'AVAILABLE');
    const selectedAmbulance = selectedAmbulanceId ? ambulances.find(a => a.id === selectedAmbulanceId) : null;
    const distanceKm = routeMetrics?.distanceKm ?? 0;
    const durationMin = routeMetrics?.durationMinutes ?? null;
    const computedFare = (() => {
            if (!pickupCoords || !dropCoords) return null;
            const base = selectedAmbulance?.baseCharge ?? 75;
            const perKm = selectedAmbulance?.pricePerKm ?? 12;
            const km = distanceKm || 5.2;
            return Math.max(base, base + Math.max(km - 1, 0) * perKm);
    })();

      useEffect(() => {
          if (activeRide) return;
          if (availableAmbulances.length === 0) {
              setSelectedAmbulanceId(null);
              return;
          }
          const stillValid = selectedAmbulanceId && availableAmbulances.some(a => a.id === selectedAmbulanceId);
          if (!stillValid) {
              setSelectedAmbulanceId(availableAmbulances[0].id);
          }
    }, [availableAmbulances, activeRide, selectedAmbulanceId]);

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
    <div className="h-screen flex flex-col md:flex-row bg-black text-white overflow-hidden">
        {/* Navigation Rail */}
        <nav className="order-2 md:order-1 h-20 md:h-full w-full md:w-24 bg-black/80 border-t md:border-t-0 md:border-r border-white/10 flex flex-row md:flex-col items-center justify-around md:justify-start md:pt-10 z-30 shadow-lg md:shadow-none shrink-0 backdrop-blur-xl">
            <div className="hidden md:flex w-10 h-10 bg-white rounded-lg mb-10 shadow-lg shadow-black/40 items-center justify-center">
                <Activity className="text-black" size={20} />
            </div>
            <button onClick={() => setActiveTab('RIDE')} className={`p-4 rounded-2xl transition-all relative group ${activeTab === 'RIDE' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Navigation size={28} />
                <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Ambulance</span>
            </button>
            <button onClick={() => setActiveTab('SHOP')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'SHOP' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Droplet size={28} />
                <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Blood Bank</span>
            </button>
            <button onClick={() => setActiveTab('WISHLIST')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'WISHLIST' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Heart size={28} />
                 <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Wishlist</span>
            </button>
            <button onClick={() => setActiveTab('ORDERS')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'ORDERS' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Package size={28} />
                 <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Orders</span>
            </button>
             <button onClick={() => setActiveTab('PROFILE')} className={`p-4 rounded-2xl transition-all mt-0 md:mt-4 relative group ${activeTab === 'PROFILE' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                <Settings size={28} />
                 <span className="hidden md:block absolute left-full ml-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50">Profile</span>
            </button>
            <button onClick={logout} className="p-4 rounded-2xl text-white/50 hover:text-white md:mt-auto md:mb-8 transition-colors"><LogOut size={28} /></button>
        </nav>

        {/* Content Area */}
        <div className="order-1 md:order-2 flex-1 relative h-[calc(100vh-80px)] md:h-screen overflow-hidden">
            <AnimatePresence mode="wait">
                
                {/* --- RIDE TAB --- */}
                {activeTab === 'RIDE' && (
                    <motion.div key="ride" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative flex flex-col md:block">
                         {/* Map takes full height on desktop, but flex on mobile */}
                         <div className="absolute top-0 right-0 bottom-0 left-0 md:left-[420px] z-0 h-full w-full">
                             <MapComponent 
                                 center={mapCenter} 
                                 markers={markers} 
                                 route={routePath} 
                                 onRouteInfo={setRouteMetrics}
                                 onRouteCoords={setRoutePolylineCoords}
                             />
                         </div>

                         {/* Side Panel (Desktop) / Bottom Sheet (Mobile) */}
                                 <div className="absolute top-0 left-0 w-full md:w-[420px] h-[55vh] md:h-full bg-black/70 shadow-[0_-10px_60px_rgba(0,0,0,0.6)] md:shadow-2xl z-10 p-6 flex flex-col pointer-events-auto overflow-y-auto rounded-t-[2rem] md:rounded-none border-t border-white/10 md:border-t-0 md:border-r md:border-white/10 backdrop-blur-xl">
                                     <div className="md:hidden w-10 h-1 bg-white/30 rounded-full mx-auto mb-5" /> {/* Mobile Handle */}
                                     <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mt-4">VAYRIN</h1>
                                     <p className="text-sm text-white/60 mb-6">Book an ambulance</p>
                            <AnimatePresence mode="wait">
                                {!activeRide && (
                                    <div className="flex-1 flex flex-col relative" ref={dropdownRef}>
                                        <div className="relative mb-6">
                                            {/* Connecting Line */}
                                            <div className="absolute left-[18px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-blue-200 via-slate-200 to-rose-200 z-0 rounded-full" />
                                            {/* Pickup */}
                                            <div className="relative z-[15] mb-4">
                                                <div className="flex items-center gap-3 bg-white/5 px-4 py-3.5 rounded-xl border border-white/10 shadow-sm focus-within:ring-2 focus-within:ring-white/20 focus-within:border-white/20 transition-all">
                                                    <div className="w-3 h-3 rounded-full bg-white shrink-0" />
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
                                                                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                            >
                                                                <LocateFixed size={18} />
                                                            </button>
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            {/* Drop */}
                                            <div className="relative z-[5]">
                                                <div className="flex items-center gap-3 bg-white/5 px-4 py-3.5 rounded-xl border border-white/10 shadow-sm focus-within:ring-2 focus-within:ring-white/20 focus-within:border-white/20 transition-all">
                                                    <div className="w-3 h-3 rounded-sm bg-white shrink-0" />
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
                                            <>
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-4"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                                                            <AmbulanceIcon size={20} className="text-black" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-bold text-white">Trip summary</div>
                                                            <div className="text-xs text-white/60 flex gap-2">
                                                                <span>{distanceKm ? `${distanceKm.toFixed(1)} km` : 'Distance pending'}</span>
                                                                <span>•</span>
                                                                <span>{durationMin ? `${durationMin} min ETA` : 'ETA after routing'}</span>
                                                            </div>
                                                        </div>
                                                        {computedFare && (
                                                            <div className="text-right">
                                                                <div className="font-bold text-lg text-white">₹{computedFare.toFixed(0)}</div>
                                                                <div className="text-[10px] text-white/50">estimate</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>

                                                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                                    {availableAmbulances.length > 0 ? availableAmbulances.map((amb) => {
                                                        const isSelected = selectedAmbulanceId === amb.id;
                                                        const etaText = durationMin ? `${durationMin + 2} min` : 'ETA after confirm';
                                                        const typeAbbrev = amb.type === 'ADVANCED' ? 'ADV' : amb.type === 'ICU' ? 'ICU' : amb.type === 'BASIC' ? 'BAS' : (amb.type || 'AMB').slice(0, 3).toUpperCase();
                                                        return (
                                                            <button
                                                                key={amb.id}
                                                                onClick={() => setSelectedAmbulanceId(amb.id)}
                                                                className={`w-full text-left border rounded-2xl p-3.5 flex items-center gap-3 transition-all ${isSelected ? 'border-white/30 bg-white/10 shadow-md' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                                                            >
                                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white font-black text-sm">
                                                                    {typeAbbrev}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-white capitalize text-sm">{(amb.type || 'Ambulance').toLowerCase()}</span>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 truncate">{amb.plateNumber || 'Plate pending'}</span>
                                                                    </div>
                                                                    <div className="text-xs text-white/60 mt-1 truncate">
                                                                        {amb.driverName || 'On-call'} • ₹{amb.baseCharge || 0} + ₹{amb.pricePerKm || 0}/km
                                                                    </div>
                                                                    {amb.equipment?.length > 0 && (
                                                                        <div className="text-[10px] text-white/40 mt-0.5 truncate">{amb.equipment.slice(0, 2).join(', ')}</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <div className="font-bold text-white">₹{Math.max(amb.baseCharge || 0, (amb.baseCharge || 0) + Math.max((distanceKm || 5.2) - 1, 0) * (amb.pricePerKm || 0)).toFixed(0)}</div>
                                                                    <div className="text-[10px] text-white/50">~{etaText}</div>
                                                                </div>
                                                            </button>
                                                        );
                                                    }) : (
                                                        <div className="text-sm text-white/60 text-center py-6 border border-dashed border-white/15 rounded-xl bg-white/5">No available ambulances right now.</div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        <Button 
                                            onClick={handleBookRide} 
                                            className={`w-full h-14 text-lg rounded-2xl mt-auto md:mt-4 font-bold transition-all crossleg ${
                                                pickupCoords && dropCoords && selectedAmbulanceId
                                                    ? 'bg-black text-white hover:bg-slate-800 shadow-lg shadow-black/20' 
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`} 
                                            disabled={!pickupCoords || !dropCoords || !selectedAmbulanceId}
                                        >
                                            {pickupCoords && dropCoords ? (selectedAmbulance ? `Request ${selectedAmbulance.type}` : 'Select an ambulance') : 'Enter pickup & destination'}
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
                                            {/* Status Banner */}
                                            <div className={`${(currentPhase === 'arriving' || currentPhase === 'waiting_at_pickup') ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'} border p-4 rounded-xl mb-6 flex items-center gap-4`}>
                                                {(currentPhase === 'arriving' || currentPhase === 'waiting_at_pickup') ? (
                                                    <Clock size={24} className="text-amber-600" />
                                                ) : (
                                                    <CheckCircle2 size={24} className="text-emerald-600" />
                                                )}
                                                <div className="flex-1">
                                                    <div className={`font-bold ${(currentPhase === 'arriving' || currentPhase === 'waiting_at_pickup') ? 'text-amber-800' : 'text-emerald-800'}`}>
                                                        {currentPhase === 'to_pickup' && 'Driver on the way'}
                                                        {currentPhase === 'arriving' && 'Driver arrived!'}
                                                        {currentPhase === 'waiting_at_pickup' && 'Boarding...'}
                                                        {currentPhase === 'to_drop' && 'Ride in Progress'}
                                                        {!currentPhase && activeRide.status === 'in_progress' && 'Ride in Progress'}
                                                    </div>
                                                    <div className={`text-xs ${(currentPhase === 'arriving' || currentPhase === 'waiting_at_pickup') ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        {currentPhase === 'to_pickup' && 'Track vehicle on map'}
                                                        {currentPhase === 'arriving' && 'Preparing for pickup...'}
                                                        {currentPhase === 'waiting_at_pickup' && 'Board the ambulance now'}
                                                        {(currentPhase === 'to_drop' || (!currentPhase && activeRide.status === 'in_progress')) && 'Heading to hospital'}
                                                    </div>
                                                </div>
                                                {/* Arriving countdown timer (50 sec) */}
                                                {currentPhase === 'arriving' && arrivingCountdown > 0 && (
                                                    <div className="flex flex-col items-center bg-amber-100 px-4 py-2 rounded-lg">
                                                        <div className="text-2xl font-bold text-amber-700">
                                                            {arrivingCountdown}s
                                                        </div>
                                                        <div className="text-xs text-amber-600">Arriving</div>
                                                    </div>
                                                )}
                                                {/* Waiting countdown timer (2 min) */}
                                                {currentPhase === 'waiting_at_pickup' && waitingCountdown > 0 && (
                                                    <div className="flex flex-col items-center bg-amber-100 px-4 py-2 rounded-lg">
                                                        <div className="text-2xl font-bold text-amber-700">
                                                            {Math.floor(waitingCountdown / 60)}:{(waitingCountdown % 60).toString().padStart(2, '0')}
                                                        </div>
                                                        <div className="text-xs text-amber-600">Board now</div>
                                                    </div>
                                                )}
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
                    <motion.div key="shop" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-black">
                        <header className="flex flex-col md:flex-row justify-between items-center mb-8 sticky headtop bg-black/80 backdrop-blur-md py-4 z-20 gap-4">
                            <div><h2 className="text-3xl font-bold text-white">Blood Marketplace</h2><p className="text-white/60">Verified inventory from registered hospitals.</p></div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                    <input className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500/30" placeholder="Search blood type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="relative">
                                    <Button className="pl-4 pr-6 bg-rose hover:bg-rose  text-black" onClick={() => setShowCartDrawer(true)}>
                                        <ShoppingCart size={20} className="mr-2" /> Cart
                                    </Button>
                                    {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black shadow-sm">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>}
                                </div>
                            </div>
                        </header>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                            {availableBloodStock.length > 0 ? (
                                availableBloodStock.map((item) => (
                                    <Card key={item.id} className="group border border-white/10 bg-black hover:border-rose-500/30">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-2xl border border-rose-500/20">{item.type}</div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-white">${item.price}</div>
                                                <button
                                                    onClick={() => toggleWishlist(item.id)}
                                                    className={`mt-1 p-1 rounded-full transition-colors ${wishlist.includes(item.id)
                                                        ? 'text-rose-500 bg-rose-500/20'
                                                        : 'text-white/30 hover:bg-rose-500/15 hover:text-rose-400'
                                                    }`}
                                                >
                                                    <Heart size={16} fill={wishlist.includes(item.id) ? "currentColor" : "none"} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-6 border-b border-white/10 pb-4">
                                            <div className="text-sm font-bold text-white truncate">{item.hospitalName}</div>
                                            <div className="flex justify-between text-xs text-white/50"><span>Expires:</span><span className="font-medium text-white/70">{item.expiryDate}</span></div>
                                            <div className="flex justify-between text-xs"><span className="text-white/50">Availability:</span><span className="text-emerald-400 font-bold">{item.units} Units</span></div>
                                        </div>
                                        <Button variant="secondary" className="w-full bg-black text-white border-white hover:bg-white font-semibold" onClick={() => addToCart(item)}>
                                            Add to Cart <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center text-white/40"><p>No inventory found for "{searchTerm}".</p></div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- WISHLIST TAB --- */}
                {activeTab === 'WISHLIST' && (
                    <motion.div key="wishlist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-black">
                        <header className="mb-8"><h2 className="text-3xl font-bold text-white">My Wishlist</h2><p className="text-white/60">Saved items for later.</p></header>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {wishlistItems.length > 0 ? (
                                wishlistItems.map((item) => (
                                    <Card key={item.id} className="border border-white/10 bg-black hover:border-rose-500/30">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-14 h-14 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-black text-xl border border-rose-500/20">{item.type}</div>
                                            <button onClick={() => toggleWishlist(item.id)} className="text-rose-500 hover:bg-rose-500/20 p-2 rounded-full"><Heart fill="currentColor"/></button>
                                        </div>
                                        <div className="text-sm font-bold text-white mb-1">{item.hospitalName}</div>
                                        <div className="text-lg font-bold text-white mb-4">${item.price}</div>
                                        <Button className="w-full bg-white text-black hover:bg-white/90 font-semibold" onClick={() => addToCart(item)}>Move to Cart</Button>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-white/40"><Heart size={48} className="mb-4 text-white/20" /><p>Your wishlist is empty.</p></div>
                            )}
                         </div>
                    </motion.div>
                )}

                {/* --- ORDERS TAB --- */}
                {activeTab === 'ORDERS' && (
                    <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-black">
                         <header className="mb-8"><h2 className="text-3xl font-bold text-white">Order History</h2><p className="text-white/60">Track and view invoices.</p></header>
                        <div className="space-y-4 max-w-4xl">
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <Card key={order.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 bg-black p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white"><Package size={22} /></div>
                                            <div>
                                                <div className="font-bold text-white text-lg">{order.items ? order.items.length : 0} Items • ${order.totalAmount}</div>
                                                <div className="text-xs text-white/50 mt-0.5">Order #{order.id.slice(0, 8)} • {new Date(order.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${order.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : order.status === 'DISPATCHED' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-black'}`}>{order.status}</span>
                                            <Button variant="secondary" className="h-9 px-4 bg-white text-black border-white  font-semibold text-xs" onClick={() => setViewingOrder(order)}><FileText size={14} className="mr-1.5" /> Invoice</Button>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-20 text-white/40 border border-dashed border-white/10 rounded-2xl"><Package size={48} className="mx-auto mb-4 text-white/20" /><p>No past orders found.</p></div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- PROFILE TAB --- */}
                {activeTab === 'PROFILE' && (
                    <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full overflow-y-auto p-6 md:p-10 bg-black">
                         <div className="max-w-xl mx-auto">
                             <Card className="bg-black border border-white/10 p-8">
                                <div className="mb-8 pb-6 border-b border-white/10">
                                    <h3 className="text-2xl font-bold text-white">My Profile</h3>
                                    <p className="text-white/50 text-sm mt-1">Manage your account settings</p>
                                </div>
                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                     <div>
                                         <Label className="text-white/70 text-sm font-medium mb-2 block">Full Name</Label>
                                         <Input value={pName} onChange={e => setPName(e.target.value)} className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-white/40" placeholder="Enter your name" />
                                     </div>
                                     <div>
                                         <Label className="text-white/70 text-sm font-medium mb-2 block">Phone Number</Label>
                                         <Input value={pPhone} onChange={e => setPPhone(e.target.value)} className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-white/40" placeholder="+91 XXXXX XXXXX" />
                                     </div>
                                     <div>
                                         <Label className="text-white/70 text-sm font-medium mb-2 block">Home Address</Label>
                                         <Input value={pAddress} onChange={e => setPAddress(e.target.value)} className="bg-white/5 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-white/40" placeholder="Enter your address" />
                                     </div>
                                     <div className="pt-4"><Button type="submit" isLoading={isSubmittingProfile} className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold text-base rounded-xl">Save Changes</Button></div>
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCartDrawer(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-md bg-black border-l border-white/10 shadow-2xl z-50 flex flex-col">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2"><ShoppingCart size={20} /> Your Cart</h3>
                                <button onClick={() => setShowCartDrawer(false)} className="p-2 hover:bg-white/10 rounded-full text-white/60"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {cart.length === 0 ? <div className="text-center text-white/40 mt-20"><ShoppingCart size={48} className="mx-auto mb-4 opacity-50"/>Cart is empty</div> : cart.map(item => (
                                    <div key={item.id} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-xl shadow-sm">
                                        <div className="w-16 h-16 bg-rose-500/20 rounded-lg flex items-center justify-center text-rose-500 font-bold">{item.type}</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white">{item.hospitalName}</div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-3 bg-white/10 rounded-lg p-1">
                                                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"><Minus size={12}/></button>
                                                    <div className="text-sm font-bold w-4 text-center text-white">{item.quantity}</div>
                                                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:bg-white/10 rounded-md transition-colors text-white"><Plus size={12}/></button>
                                                </div>
                                                <button onClick={() => removeFromCart(item.id)} className="text-xs text-rose-500 hover:underline">Remove</button>
                                            </div>
                                        </div>
                                        <div className="text-right font-bold text-white">${item.price * item.quantity}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-white/10 bg-black">
                                <div className="flex justify-between items-center mb-6"><span className="text-white/60">Total Amount</span><span className="text-2xl font-bold text-white">${cartTotal}</span></div>
                                {orderSuccess ? <div className="w-full py-4 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center font-bold"><CheckCircle2 size={20} className="mr-2" /> Order Placed!</div> : <Button onClick={handleCheckout} isLoading={isProcessingPayment} disabled={cart.length === 0} className="w-full bg-white text-black py-4 text-lg hover:bg-white/90">Checkout Now</Button>}
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
                                <div className="text-right"><h3 className="font-bold text-xl">VAYRIN</h3></div>
                            </div>
                            <div className="p-8">
                                <table className="w-full text-left mb-8">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase"><tr><th className="py-3 px-4">Item</th><th className="py-3 px-4">Hospital</th><th className="py-3 px-4 text-center">Qty</th><th className="py-3 px-4 text-right">Amount</th></tr></thead>
                                    <tbody className="text-sm divide-y divide-slate-100 text-black">{viewingOrder.items.map((item, i) => (<tr key={i}><td className="py-3 px-4 font-bold">{item.type} Blood</td><td className="py-3 px-4">{item.hospitalName}</td><td className="py-3 px-4 text-center">{item.quantity}</td><td className="py-3 px-4 text-right">${item.price * item.quantity}</td></tr>))}</tbody>
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

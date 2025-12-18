import React, { useEffect, useRef, useState } from 'react';
import { directionsBasic } from '../lib/olaApi';

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    type: 'USER' | 'AMBULANCE' | 'DESTINATION';
    bearing?: number; // rotation angle for ambulance icon
  }>;
  route?: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  } | null;
  onMapLoad?: () => void;
  onRouteInfo?: (info: { distanceKm: number; durationMinutes: number } | null) => void;
  onRouteCoords?: (coords: [number, number][] | null) => void; // Route polyline coordinates [lng, lat]
}

const OLAMAPS_API_KEY = import.meta.env.VITE_OLAMAPS_API_KEY;
let olaSdkModule: any = null;
let olaMapsPromise: Promise<any> | null = null;

const loadOlaMapsSdk = () => {
    if (!olaMapsPromise) {
        olaMapsPromise = import('olamaps-web-sdk').then((module) => {
            olaSdkModule = module;
            return module;
        });
    }
    return olaMapsPromise;
};

export const MapComponent = ({ center, zoom = 14, markers = [], route, onMapLoad, onRouteInfo, onRouteCoords }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const containerIdRef = useRef<string>(`ola-map-${Math.random().toString(36).slice(2)}`);
    const [routeInfo, setRouteInfo] = useState<{ distance_meters: number; duration_seconds: number } | null>(null);

    // 1. Load Ola Maps SDK (npm) and initialize map once ready
    useEffect(() => {
        let isMounted = true;
        loadOlaMapsSdk()
            .then(() => {
                if (!isMounted || mapInstance.current || !mapContainerRef.current) return;
                initMap();
            })
            .catch((err) => {
                console.error('Ola Maps SDK load error:', err);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const initMap = () => {
        try {
            const defaultCenter = { lat: 28.6139, lng: 77.209 }; // New Delhi
            const mapCenter = center || defaultCenter;
            if (!OLAMAPS_API_KEY) {
                throw new Error('Missing Ola Maps API key. Set VITE_OLAMAPS_API_KEY in your env.');
            }

            const { OlaMaps } = olaSdkModule;
            const olaMaps = new OlaMaps({ apiKey: OLAMAPS_API_KEY });
            // Basic style; replace with your hosted tiles style JSON if available
            const styleUrl = 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json';

            // Assign an id to the container for Ola init API
            const containerEl = mapContainerRef.current as HTMLDivElement;
            const id = containerIdRef.current;
            if (!containerEl.id) containerEl.id = id;

            mapInstance.current = olaMaps.init({
                style: styleUrl,
                container: containerEl,
                center: [mapCenter.lng, mapCenter.lat],
                zoom: zoom,
            });
            if (mapInstance.current?.on) {
                mapInstance.current.on('load', () => {
                    setIsMapReady(true);
                    if (onMapLoad) onMapLoad();
                });
            } else {
                setIsMapReady(true);
                if (onMapLoad) onMapLoad();
            }
        } catch (e) {
            console.error('Ola Maps Init Error:', e);
        }
    };

    const decodePolyline = (encoded: string): [number, number][] => {
        const coordinates: [number, number][] = [];
        let index = 0, lat = 0, lng = 0;

        while (index < encoded.length) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
            lng += dlng;

            // GeoJSON uses [lng, lat]
            coordinates.push([lng / 1e5, lat / 1e5]);
        }

        return coordinates;
    };

    const normalizeGeometry = (geometry: any): { type: 'LineString'; coordinates: [number, number][] } | null => {
        if (!geometry) return null;
        
        // Already a LineString GeoJSON
        if (geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
            return geometry;
        }
        
        // Feature wrapper
        if (geometry.type === 'Feature' && geometry.geometry?.type === 'LineString') {
            return geometry.geometry;
        }
        
        // Encoded polyline string
        if (typeof geometry === 'string' && geometry.length > 0) {
            try {
                const coords = decodePolyline(geometry);
                if (coords.length > 0) {
                    return { type: 'LineString', coordinates: coords };
                }
            } catch (err) {
                console.error('Failed to decode polyline:', err);
            }
        }
        
        return null;
    };

    const upsertSource = (id: string, data: any) => {
        const map = mapInstance.current;
        if (!map?.getSource) return;
        const existing = map.getSource(id) as any;
        if (existing?.setData) existing.setData(data);
        else if (map.addSource) map.addSource(id, { type: 'geojson', data });
    };

    const ensureLayer = (id: string, layer: any) => {
        const map = mapInstance.current;
        if (!map?.getLayer || !map?.addLayer) return;
        if (!map.getLayer(id)) map.addLayer(layer);
    };

    // Fetch and draw route when parent provides a start/end route
    useEffect(() => {
        const draw = async () => {
            if (!isMapReady || !mapInstance.current) return;
            
            const map = mapInstance.current;
            
            // Clear route if no endpoints
            if (!route?.start || !route?.end) {
                try {
                    if (map.getSource?.('route-source')) {
                        (map.getSource('route-source') as any)?.setData?.({ 
                            type: 'FeatureCollection', 
                            features: [] 
                        });
                    }
                } catch (e) { /* ignore */ }
                    setRouteInfo(null);
                    if (onRouteInfo) onRouteInfo(null);
                    if (onRouteCoords) onRouteCoords(null);
                return;
            }
            
            try {
                console.log('Fetching route:', route.start, '->', route.end);
                const routes = await directionsBasic({ 
                    origin: route.start, 
                    destination: route.end, 
                    overview: 'full' 
                });
                
                if (!routes.length) {
                    console.warn('No routes returned');
                    return;
                }
                
                const best = routes[0];
                console.log('Route received:', best);
                
                    const metrics = { 
                        distance_meters: best.distance_meters, 
                        duration_seconds: best.duration_seconds 
                    };
                    setRouteInfo(metrics);
                    if (onRouteInfo) {
                        onRouteInfo({
                            distanceKm: Number((metrics.distance_meters / 1000).toFixed(2)),
                            durationMinutes: Math.max(1, Math.round(metrics.duration_seconds / 60))
                        });
                    }
                
                // Parse and draw geometry
                const lineGeometry = normalizeGeometry(best.geometry);
                
                if (lineGeometry && lineGeometry.coordinates.length > 0) {
                    // Pass route coordinates to parent for ambulance animation
                    if (onRouteCoords) {
                        onRouteCoords(lineGeometry.coordinates);
                    }
                    
                    const geojsonData = {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: lineGeometry,
                    };
                    
                    // Upsert source
                    if (map.getSource?.('route-source')) {
                        (map.getSource('route-source') as any)?.setData?.(geojsonData);
                    } else if (map.addSource) {
                        map.addSource('route-source', { type: 'geojson', data: geojsonData });
                    }
                    
                    // Add layer if not exists
                    if (map.addLayer && !map.getLayer?.('route-line')) {
                        // Add outline first for better visibility
                        map.addLayer({
                            id: 'route-line-outline',
                            type: 'line',
                            source: 'route-source',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                            },
                            paint: {
                                'line-color': '#1e293b',
                                'line-width': 8,
                                'line-opacity': 0.3,
                            },
                        });
                        
                        map.addLayer({
                            id: 'route-line',
                            type: 'line',
                            source: 'route-source',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                            },
                            paint: {
                                'line-color': '#1e293b',
                                'line-width': 5,
                                'line-opacity': 1,
                            },
                        });
                    }
                    
                    // Fit bounds to show full route
                    if (map.fitBounds && lineGeometry.coordinates.length > 1) {
                        const lngs = lineGeometry.coordinates.map((c) => c[0]);
                        const lats = lineGeometry.coordinates.map((c) => c[1]);
                        const bounds: [[number, number], [number, number]] = [
                            [Math.min(...lngs), Math.min(...lats)],
                            [Math.max(...lngs), Math.max(...lats)],
                        ];
                        map.fitBounds(bounds, { padding: 60, duration: 500 });
                    }
                } else {
                    console.warn('Could not parse route geometry:', best.geometry);
                }
            } catch (err) {
                console.error('Directions error:', err);
            }
        };
        
        draw();
    }, [route, isMapReady, onRouteInfo, onRouteCoords]);

    // 2. Sync Center
    useEffect(() => {
        if (isMapReady && mapInstance.current && center) {
            if (!route) {
                // per docs: [lng, lat]
                mapInstance.current.setCenter([center.lng, center.lat]);
                mapInstance.current.setZoom(zoom);
            }
        }
    }, [center, zoom, isMapReady, route]);

    // 3. Sync Markers via GeoJSON circles
    useEffect(() => {
        if (!isMapReady || !mapInstance.current) return;
        
        const map = mapInstance.current;
        
        const featureCollection = {
            type: 'FeatureCollection' as const,
            features: markers.map((m) => ({
                type: 'Feature' as const,
                properties: { type: m.type, id: m.id },
                geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
            })),
        };
        
        // Upsert markers source
        try {
            if (map.getSource?.('markers-source')) {
                (map.getSource('markers-source') as any)?.setData?.(featureCollection);
            } else if (map.addSource) {
                map.addSource('markers-source', { type: 'geojson', data: featureCollection });
            }
        } catch (e) {
            console.warn('Failed to update markers source:', e);
            return;
        }
        
        // User location radar pulse effect
        if (map.addLayer && !map.getLayer?.('markers-radar')) {
            try {
                map.addLayer({
                    id: 'markers-radar',
                    type: 'circle',
                    source: 'markers-source',
                    filter: ['==', ['get', 'type'], 'USER'],
                    paint: {
                        'circle-color': '#3b82f6',
                        'circle-opacity': 0.2,
                        'circle-radius': 24,
                        'circle-blur': 0.8,
                    },
                });
            } catch (e) { /* layer may already exist */ }
        }
        
        // Main marker circles (non-ambulance)
        if (map.addLayer && !map.getLayer?.('markers-circle')) {
            try {
                map.addLayer({
                    id: 'markers-circle',
                    type: 'circle',
                    source: 'markers-source',
                    filter: ['!=', ['get', 'type'], 'AMBULANCE'], // Exclude ambulance from circle markers
                    paint: {
                        'circle-radius': [
                            'match',
                            ['get', 'type'],
                            'DESTINATION', 12,
                            'USER', 11,
                            10
                        ],
                        'circle-color': [
                            'match',
                            ['get', 'type'],
                            'USER', '#3b82f6',
                            'DESTINATION', '#ef4444',
                            '#6b7280',
                        ],
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': [
                            'match',
                            ['get', 'type'],
                            'DESTINATION', 4,
                            'USER', 3,
                            3
                        ],
                    },
                });
            } catch (e) { /* layer may already exist */ }
        }
        
        // Ambulance marker with custom icon
        // First, load ambulance icon image if not already loaded
        const loadAmbulanceIcon = async () => {
            if (!map.hasImage?.('ambulance-icon')) {
                try {
                    // Create ambulance icon as canvas
                    const size = 48;
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Draw ambulance icon (orange car-like shape)
                        ctx.fillStyle = '#f97316'; // Orange
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 2;
                        
                        // Main body (rounded rectangle)
                        ctx.beginPath();
                        ctx.roundRect(8, 12, 32, 24, 6);
                        ctx.fill();
                        ctx.stroke();
                        
                        // Front cabin
                        ctx.fillStyle = '#ea580c';
                        ctx.beginPath();
                        ctx.roundRect(28, 16, 10, 16, 4);
                        ctx.fill();
                        
                        // Cross symbol (medical)
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(18, 20, 8, 3);
                        ctx.fillRect(20.5, 17, 3, 9);
                        
                        // Direction indicator (arrow at top)
                        ctx.fillStyle = '#1e293b';
                        ctx.beginPath();
                        ctx.moveTo(24, 4);
                        ctx.lineTo(30, 12);
                        ctx.lineTo(18, 12);
                        ctx.closePath();
                        ctx.fill();
                    }
                    
                    const imageData = ctx?.getImageData(0, 0, size, size);
                    if (imageData && map.addImage) {
                        map.addImage('ambulance-icon', { width: size, height: size, data: imageData.data });
                    }
                } catch (e) {
                    console.warn('Failed to create ambulance icon:', e);
                }
            }
            
            // Add ambulance symbol layer
            if (map.addLayer && !map.getLayer?.('ambulance-symbol')) {
                try {
                    map.addLayer({
                        id: 'ambulance-symbol',
                        type: 'symbol',
                        source: 'markers-source',
                        filter: ['==', ['get', 'type'], 'AMBULANCE'],
                        layout: {
                            'icon-image': 'ambulance-icon',
                            'icon-size': 0.8,
                            'icon-rotate': ['coalesce', ['get', 'bearing'], 0],
                            'icon-rotation-alignment': 'map',
                            'icon-allow-overlap': true,
                            'icon-ignore-placement': true,
                        },
                    });
                } catch (e) { /* layer may already exist */ }
            }
        };
        
        loadAmbulanceIcon();
    }, [markers, isMapReady]);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      
      {!isMapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-20">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium text-sm">Loading Ola Maps...</p>
        </div>
      )}
      
      {/* Route Info Badge */}
      {routeInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white px-5 py-2.5 rounded-full shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-800">
              {(routeInfo.distance_meters / 1000).toFixed(1)} km
            </span>
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-800">
              {Math.ceil(routeInfo.duration_seconds / 60)} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
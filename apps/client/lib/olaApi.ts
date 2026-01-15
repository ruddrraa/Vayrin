// Simple Ola Maps API client wrappers
// Uses Vite env: VITE_OLAMAPS_API_KEY

const BASE_URL = "https://api.olamaps.io";

function getApiKey(): string {
  const key = import.meta.env.VITE_OLAMAPS_API_KEY as string | undefined;
  if (!key) throw new Error("Missing VITE_OLAMAPS_API_KEY in env");
  return key;
}

// Reverse Geocoding - Convert lat/lng to address
export type ReverseGeocodeResult = {
  formatted_address: string;
  name?: string;
  place_id?: string;
};

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const params = new URLSearchParams();
  params.set("latlng", `${lat},${lng}`);
  params.set("api_key", getApiKey());

  const url = `${BASE_URL}/places/v1/reverse-geocode?${params.toString()}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Reverse geocode failed:", res.status);
      return null;
    }
    const json = await res.json();
    
    // Ola returns results array
    const results = json?.results ?? [];
    if (results.length === 0) return null;
    
    const first = results[0];
    return {
      formatted_address: first.formatted_address ?? first.name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      name: first.name,
      place_id: first.place_id,
    };
  } catch (err) {
    console.error("Reverse geocode error:", err);
    return null;
  }
}

export type AutocompleteSuggestion = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export async function placesAutocomplete(input: string, opts?: {
  location?: { lat: number; lng: number };
  radius?: number;
  strictbounds?: boolean;
  language?: string;
}): Promise<AutocompleteSuggestion[]> {
  if (!input || input.trim().length === 0) return [];
  const params = new URLSearchParams();
  params.set("input", input.trim());
  if (opts?.location) params.set("location", `${opts.location.lat},${opts.location.lng}`);
  if (opts?.radius) params.set("radius", String(opts.radius));
  if (typeof opts?.strictbounds === "boolean") params.set("strictbounds", String(opts.strictbounds));
  if (opts?.language) params.set("language", opts.language);
  params.set("api_key", getApiKey());

  const url = `${BASE_URL}/places/v1/autocomplete?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Autocomplete failed: ${res.status}`);
  const json = await res.json();
  const predictions = json?.predictions ?? json?.data ?? [];
  return predictions.map((p: any) => ({
    place_id: p.place_id,
    description: p.description ?? p.structured_formatting?.main_text ?? "",
    structured_formatting: p.structured_formatting,
  }));
}

export type PlaceDetails = {
  place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
};

export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!placeId) return null;
  const params = new URLSearchParams();
  params.set("place_id", placeId);
  params.set("api_key", getApiKey());
  const url = `${BASE_URL}/places/v1/details?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place details failed: ${res.status}`);
  const json = await res.json();
  const result = json?.result ?? json?.data ?? json;
  const loc = result?.geometry?.location;
  return {
    place_id: result?.place_id ?? placeId,
    name: result?.name,
    formatted_address: result?.formatted_address,
    geometry: loc ? { location: { lat: Number(loc.lat), lng: Number(loc.lng) } } : undefined,
  };
}

export type DirectionsBasicRoute = {
  distance_meters: number;
  duration_seconds: number;
  geometry?: string; // polyline (encoded) or GeoJSON depending on API
};

export async function directionsBasic(args: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number }>;
  steps?: boolean;
  overview?: "full" | "simplified" | "false";
}): Promise<DirectionsBasicRoute[]> {
  // Build query params - Ola Directions Basic is POST but params go in query string
  const params = new URLSearchParams();
  params.set("origin", `${args.origin.lat},${args.origin.lng}`);
  params.set("destination", `${args.destination.lat},${args.destination.lng}`);
  if (args.waypoints?.length) {
    params.set("waypoints", args.waypoints.map((w) => `${w.lat},${w.lng}`).join("|"));
  }
  params.set("steps", args.steps !== false ? "true" : "false");
  params.set("overview", args.overview || "full");
  params.set("api_key", getApiKey());

  const url = `${BASE_URL}/routing/v1/directions/basic?${params.toString()}`;
  
  try {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Directions API error:", res.status, errText);
      throw new Error(`Directions failed: ${res.status}`);
    }
    const json = await res.json();
    
    // Parse response - Ola returns routes array with legs
    const routes = json?.routes ?? [];
    return routes.map((r: any) => {
      // Distance and duration may be in legs or at route level
      let distance = 0;
      let duration = 0;
      
      if (r.legs?.length) {
        for (const leg of r.legs) {
          distance += Number(leg.distance ?? 0);
          duration += Number(leg.duration ?? 0);
        }
      } else {
        distance = Number(r.distance ?? 0);
        duration = Number(r.duration ?? 0);
      }
      
      // Geometry is usually encoded polyline in overview_polyline or geometry field
      const geometry = r.overview_polyline?.points ?? r.overview_polyline ?? r.geometry ?? null;
      
      return {
        distance_meters: distance,
        duration_seconds: duration,
        geometry,
      };
    });
  } catch (err) {
    console.error("Directions fetch error:", err);
    throw err;
  }
}

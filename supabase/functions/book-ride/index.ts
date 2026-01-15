// Supabase Edge Function: book-ride
// Creates a ride request and (optionally) auto-dispatches an available ambulance.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type BookRideBody = {
  // If provided, function will attempt to auto-dispatch this existing ride.
  ride_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  price?: number;
  distance?: string;
  duration?: string;
  preferred_ambulance_id?: string | null;
  auto_dispatch?: boolean;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Use user's JWT (verify_jwt=true in config.toml)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: BookRideBody;
  try {
    body = (await req.json()) as BookRideBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let ride: any;

  if (body.ride_id) {
    const { data: existing, error: existingError } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("id", body.ride_id)
      .single();

    if (existingError || !existing) {
      return new Response(JSON.stringify({ error: existingError?.message ?? "Ride not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Only allow dispatching rides owned by the caller (MVP)
    if (existing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    ride = existing;
  } else {
    const required = [
      body.pickup_lat,
      body.pickup_lng,
      body.pickup_address,
      body.drop_lat,
      body.drop_lng,
      body.drop_address,
    ];

    if (required.some((v) => v === undefined || v === null || v === "")) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 1) Create ride request (RLS: user_id must be auth.uid())
    const { data: created, error: rideError } = await supabase
      .from("ride_requests")
      .insert({
        user_id: user.id,
        pickup_lat: body.pickup_lat,
        pickup_lng: body.pickup_lng,
        pickup_address: body.pickup_address,
        drop_lat: body.drop_lat,
        drop_lng: body.drop_lng,
        drop_address: body.drop_address,
        price: body.price ?? 0,
        distance: body.distance ?? null,
        duration: body.duration ?? null,
        ambulance_id: body.preferred_ambulance_id ?? null,
        status: "searching",
      })
      .select()
      .single();

    if (rideError) {
      return new Response(JSON.stringify({ error: rideError.message, code: rideError.code }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    ride = created;
  }

  const shouldDispatch = body.auto_dispatch !== false;

  if (!shouldDispatch) {
    return new Response(JSON.stringify({ ride }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // 2) Find an available ambulance (simple MVP)
  const { data: ambulance, error: ambError } = body.preferred_ambulance_id
    ? await supabase.from("ambulances").select("*").eq("id", body.preferred_ambulance_id).single()
    : await supabase.from("ambulances").select("*").eq("status", "AVAILABLE").limit(1).single();

  if (ambError || !ambulance) {
    // No dispatch possible; return ride in searching state
    return new Response(JSON.stringify({ ride, dispatch: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // 3) Find a driver for that hospital (optional)
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("hospital_id", ambulance.hospital_id)
    .eq("status", "ACTIVE")
    .limit(1)
    .single();

  const assignedDriverId = driver?.id ?? null;

  // 4) Update ride + ambulance
  const { error: rideUpdateError } = await supabase
    .from("ride_requests")
    .update({
      status: "accepted",
      ambulance_id: ambulance.id,
      driver_id: assignedDriverId,
    })
    .eq("id", ride.id);

  if (rideUpdateError) {
    return new Response(JSON.stringify({ ride, dispatch: null, warning: rideUpdateError.message }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  await supabase.from("ambulances").update({ status: "BUSY" }).eq("id", ambulance.id);

  const { data: updatedRide } = await supabase.from("ride_requests").select("*").eq("id", ride.id).single();

  return new Response(
    JSON.stringify({
      ride: updatedRide ?? ride,
      dispatch: { ambulanceId: ambulance.id, driverId: assignedDriverId },
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
});

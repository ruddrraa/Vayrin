// Supabase Edge Function: dispatch-blood
// MVP: Creates an order record and decrements blood stock safely.
// NOTE: This is a simple implementation; for strict consistency you may want DB-side RPC.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DispatchBloodBody = {
  hospital_id: string;
  items: Array<{ blood_stock_id: string; quantity: number; price: number; type?: string }>;
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
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
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

  let body: DispatchBloodBody;
  try {
    body = (await req.json()) as DispatchBloodBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body.hospital_id || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(JSON.stringify({ error: "Missing hospital_id/items" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const total = body.items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      hospital_id: body.hospital_id,
      items: body.items,
      total_amount: total,
      status: "PROCESSING",
    })
    .select()
    .single();

  if (orderError) {
    return new Response(JSON.stringify({ error: orderError.message, code: orderError.code }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Decrement stock best-effort (MVP). For strict transactional safety, implement an RPC.
  for (const it of body.items) {
    if (!it.blood_stock_id || !it.quantity) continue;

    const { data: stock } = await supabase
      .from("blood_stock")
      .select("units")
      .eq("id", it.blood_stock_id)
      .single();

    const currentUnits = Number(stock?.units ?? 0);
    const newUnits = Math.max(0, currentUnits - Number(it.quantity));

    await supabase.from("blood_stock").update({ units: newUnits }).eq("id", it.blood_stock_id);
  }

  return new Response(JSON.stringify({ order }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

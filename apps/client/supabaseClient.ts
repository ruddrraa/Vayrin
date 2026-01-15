
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// REQUIRED: RUN THIS SQL IN SUPABASE SQL EDITOR TO FIX "RELATION DOES NOT EXIST" ERRORS
// ------------------------------------------------------------------
/*
-- 1. Enable Realtime
alter publication supabase_realtime add table profiles, ambulances, drivers, blood_stock, orders, ride_requests;

-- [Previous Tables: profiles, ambulances, drivers, blood_stock, orders - KEEP THEM]

-- ... (Keep existing schema for profiles, ambulances, drivers, blood_stock, orders)

-- 9. Create Ride Requests Table (The "Uber" Logic)
create table ride_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  driver_id uuid, -- Can be null initially
  ambulance_id uuid, -- Can be null initially
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_address text,
  drop_lat numeric,
  drop_lng numeric,
  drop_address text,
  status text default 'PENDING',
  fare numeric,
  distance text,
  created_at timestamptz default now()
);
alter table ride_requests enable row level security;
create policy "Users manage own rides" on ride_requests for all using (auth.uid() = user_id);
create policy "Drivers can view pending rides" on ride_requests for select using (true); 
create policy "Drivers can update rides" on ride_requests for update using (true);

*/
// ------------------------------------------------------------------

// Configuration for LifeLine App (read from env to avoid leaking secrets)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
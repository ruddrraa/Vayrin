-- Core schema for BLOODLINE/VAYRIN
-- This migration sets up the minimal tables required for auth profiles, fleets, inventory, orders, and ride booking.

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  role text not null check (role in ('USER','HOSPITAL','DRIVER')),
  phone text,
  address text,
  city text,
  logo_url text,
  is_hospital_open boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Ambulances
create table if not exists public.ambulances (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.profiles(id) on delete cascade,
  plate_number text not null,
  driver_name text,
  type text not null check (type in ('BASIC','ICU','ADVANCED')),
  base_charge numeric not null default 0,
  price_per_km numeric not null default 0,
  status text not null check (status in ('AVAILABLE','BUSY','MAINTENANCE')) default 'AVAILABLE',
  equipment text[] not null default '{}',
  location jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_ambulances_updated_at on public.ambulances;
create trigger set_ambulances_updated_at
before update on public.ambulances
for each row execute function public.set_updated_at();

-- Drivers
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  license_number text,
  contact text,
  hourly_wage numeric not null default 0,
  status text not null check (status in ('ACTIVE','OFF_DUTY','ON_LEAVE')) default 'ACTIVE',
  total_hours numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_drivers_updated_at on public.drivers;
create trigger set_drivers_updated_at
before update on public.drivers
for each row execute function public.set_updated_at();

-- Blood stock (inventory)
create table if not exists public.blood_stock (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.profiles(id) on delete cascade,
  hospital_name text,
  type text not null,
  units integer not null default 0,
  price numeric not null default 0,
  expiry_date date,
  is_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_blood_stock_updated_at on public.blood_stock;
create trigger set_blood_stock_updated_at
before update on public.blood_stock
for each row execute function public.set_updated_at();

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hospital_id uuid not null references public.profiles(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  status text not null check (status in ('PROCESSING','DISPATCHED','DELIVERED')) default 'PROCESSING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Ride requests
create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid references public.profiles(id) on delete set null,
  ambulance_id uuid references public.ambulances(id) on delete set null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text not null,
  drop_lat double precision not null,
  drop_lng double precision not null,
  drop_address text not null,
  status text not null check (status in ('searching','accepted','in_progress','completed','cancelled')) default 'searching',
  price numeric not null default 0,
  distance text,
  duration text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_ride_requests_updated_at on public.ride_requests;
create trigger set_ride_requests_updated_at
before update on public.ride_requests
for each row execute function public.set_updated_at();

-- Realtime performance indexes
create index if not exists idx_ride_requests_user_status_created on public.ride_requests(user_id, status, created_at desc);
create index if not exists idx_ride_requests_driver_status_created on public.ride_requests(driver_id, status, created_at desc);
create index if not exists idx_ambulances_status on public.ambulances(status);

-- -------------------------
-- RLS
-- -------------------------
alter table public.profiles enable row level security;
alter table public.ambulances enable row level security;
alter table public.drivers enable row level security;
alter table public.blood_stock enable row level security;
alter table public.orders enable row level security;
alter table public.ride_requests enable row level security;

-- Profiles: owner can read/write own; hospitals can read their own only.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Ambulances/Drivers/Blood Stock: hospital owners manage their rows
create or replace function public.is_hospital()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'HOSPITAL'
  );
$$;

create or replace function public.is_driver()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'DRIVER'
  );
$$;

create or replace function public.is_user()
returns boolean language sql stable as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'USER'
  );
$$;

-- Ambulances policies
create policy "ambulances_select_all_authed" on public.ambulances
for select to authenticated
using (true);

create policy "ambulances_insert_hospital" on public.ambulances
for insert to authenticated
with check (public.is_hospital() and hospital_id = auth.uid());

create policy "ambulances_update_hospital" on public.ambulances
for update to authenticated
using (public.is_hospital() and hospital_id = auth.uid())
with check (public.is_hospital() and hospital_id = auth.uid());

create policy "ambulances_delete_hospital" on public.ambulances
for delete to authenticated
using (public.is_hospital() and hospital_id = auth.uid());

-- Drivers policies
create policy "drivers_select_all_authed" on public.drivers
for select to authenticated
using (true);

create policy "drivers_insert_hospital" on public.drivers
for insert to authenticated
with check (public.is_hospital() and hospital_id = auth.uid());

create policy "drivers_update_hospital" on public.drivers
for update to authenticated
using (public.is_hospital() and hospital_id = auth.uid())
with check (public.is_hospital() and hospital_id = auth.uid());

create policy "drivers_delete_hospital" on public.drivers
for delete to authenticated
using (public.is_hospital() and hospital_id = auth.uid());

-- Blood stock policies
create policy "blood_stock_select_all_authed" on public.blood_stock
for select to authenticated
using (true);

create policy "blood_stock_insert_hospital" on public.blood_stock
for insert to authenticated
with check (public.is_hospital() and hospital_id = auth.uid());

create policy "blood_stock_update_hospital" on public.blood_stock
for update to authenticated
using (public.is_hospital() and hospital_id = auth.uid())
with check (public.is_hospital() and hospital_id = auth.uid());

create policy "blood_stock_delete_hospital" on public.blood_stock
for delete to authenticated
using (public.is_hospital() and hospital_id = auth.uid());

-- Orders policies
create policy "orders_select_user_or_hospital" on public.orders
for select to authenticated
using (user_id = auth.uid() or hospital_id = auth.uid());

create policy "orders_insert_user" on public.orders
for insert to authenticated
with check (user_id = auth.uid());

create policy "orders_update_hospital" on public.orders
for update to authenticated
using (hospital_id = auth.uid())
with check (hospital_id = auth.uid());

-- Ride requests policies
create policy "rides_select_user_driver_hospital" on public.ride_requests
for select to authenticated
using (
  user_id = auth.uid()
  or driver_id = auth.uid()
  or exists (
    select 1
    from public.ambulances a
    where a.id = ride_requests.ambulance_id and a.hospital_id = auth.uid()
  )
);

create policy "rides_insert_user" on public.ride_requests
for insert to authenticated
with check (user_id = auth.uid());

create policy "rides_update_user_or_driver_or_hospital" on public.ride_requests
for update to authenticated
using (
  user_id = auth.uid()
  or driver_id = auth.uid()
  or exists (
    select 1
    from public.ambulances a
    where a.id = ride_requests.ambulance_id and a.hospital_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or driver_id = auth.uid()
  or exists (
    select 1
    from public.ambulances a
    where a.id = ride_requests.ambulance_id and a.hospital_id = auth.uid()
  )
);

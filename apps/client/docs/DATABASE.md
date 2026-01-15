# 🗄 LifeLine Database Schema

Complete database schema documentation for Supabase/PostgreSQL.

---

## Tables

### 1. `profiles`

User profiles linked to Supabase Auth.

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  role TEXT,  -- 'USER' | 'HOSPITAL' | 'DRIVER'
  name TEXT,
  is_hospital_open BOOLEAN DEFAULT TRUE,
  address TEXT,
  phone TEXT,
  city TEXT,
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) 
    REFERENCES auth.users (id) ON DELETE CASCADE
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to read all profiles (for hospital listings)
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

### 2. `ambulances`

Ambulance fleet managed by hospitals.

```sql
CREATE TABLE public.ambulances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  driver_name TEXT,
  status TEXT DEFAULT 'AVAILABLE',  -- 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'
  location JSONB DEFAULT '{"lat": 28.6139, "lng": 77.2090}',
  type TEXT DEFAULT 'BASIC',  -- 'BASIC' | 'ICU' | 'ADVANCED'
  base_charge NUMERIC DEFAULT 500,
  price_per_km NUMERIC DEFAULT 25,
  equipment TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ambulances" ON ambulances
  FOR SELECT USING (true);

CREATE POLICY "Hospitals can manage own ambulances" ON ambulances
  FOR ALL USING (auth.uid() = hospital_id);
```

---

### 3. `drivers`

Driver profiles for hospitals.

```sql
CREATE TABLE public.drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license_number TEXT,
  contact TEXT,
  hourly_wage NUMERIC DEFAULT 100,
  status TEXT DEFAULT 'ACTIVE',  -- 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE'
  total_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view drivers" ON drivers
  FOR SELECT USING (true);

CREATE POLICY "Hospitals can manage own drivers" ON drivers
  FOR ALL USING (auth.uid() = hospital_id);
```

---

### 4. `blood_stock`

Blood inventory per hospital.

```sql
CREATE TABLE public.blood_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_name TEXT,
  type TEXT NOT NULL,  -- 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  units INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 1500,
  expiry_date DATE,
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.blood_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blood stock" ON blood_stock
  FOR SELECT USING (true);

CREATE POLICY "Hospitals can manage own blood stock" ON blood_stock
  FOR ALL USING (auth.uid() = hospital_id);
```

---

### 5. `orders`

Blood purchase orders.

```sql
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES profiles(id),
  items JSONB NOT NULL,  -- Array of CartItem objects
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'PROCESSING',  -- 'PROCESSING' | 'DISPATCHED' | 'DELIVERED'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hospitals can view incoming orders" ON orders
  FOR SELECT USING (auth.uid() = hospital_id);

CREATE POLICY "Hospitals can update order status" ON orders
  FOR UPDATE USING (auth.uid() = hospital_id);
```

---

### 6. `ride_requests`

Ambulance booking requests.

```sql
CREATE TABLE public.ride_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id),
  ambulance_id UUID REFERENCES ambulances(id),
  pickup_lat NUMERIC NOT NULL,
  pickup_lng NUMERIC NOT NULL,
  pickup_address TEXT,
  drop_lat NUMERIC NOT NULL,
  drop_lng NUMERIC NOT NULL,
  drop_address TEXT,
  status TEXT DEFAULT 'searching',  -- 'searching' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  price NUMERIC,
  distance TEXT,
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rides" ON ride_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create rides" ON ride_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can view available rides" ON ride_requests
  FOR SELECT USING (status = 'searching');

CREATE POLICY "Drivers can accept rides" ON ride_requests
  FOR UPDATE USING (
    status = 'searching' OR auth.uid() = driver_id
  );
```

---

## Entity Relationship Diagram

```
┌─────────────┐
│   profiles  │
│─────────────│
│ id (PK)     │───────────────────────────────────┐
│ email       │                                   │
│ role        │                                   │
│ name        │                                   │
│ ...         │                                   │
└─────────────┘                                   │
      │                                           │
      │ 1:N                                       │ 1:N
      │                                           │
┌─────▼───────┐  ┌─────────────┐  ┌─────────────┐ ▼
│ ambulances  │  │   drivers   │  │ blood_stock │
│─────────────│  │─────────────│  │─────────────│
│ id (PK)     │  │ id (PK)     │  │ id (PK)     │
│ hospital_id │  │ hospital_id │  │ hospital_id │
│ plate_number│  │ name        │  │ type        │
│ status      │  │ status      │  │ units       │
│ ...         │  │ ...         │  │ ...         │
└─────────────┘  └─────────────┘  └─────────────┘

┌─────────────┐  ┌───────────────┐
│   orders    │  │ ride_requests │
│─────────────│  │───────────────│
│ id (PK)     │  │ id (PK)       │
│ user_id     │  │ user_id       │
│ hospital_id │  │ driver_id     │
│ items       │  │ ambulance_id  │
│ status      │  │ status        │
│ ...         │  │ ...           │
└─────────────┘  └───────────────┘
```

---

## Quick Setup

Run all table creation scripts in order in your Supabase SQL Editor.

**Important**: Make sure to enable RLS on all tables for security.

---

## Indexes (Recommended)

```sql
-- For faster queries
CREATE INDEX idx_ambulances_hospital ON ambulances(hospital_id);
CREATE INDEX idx_ambulances_status ON ambulances(status);
CREATE INDEX idx_drivers_hospital ON drivers(hospital_id);
CREATE INDEX idx_blood_stock_hospital ON blood_stock(hospital_id);
CREATE INDEX idx_blood_stock_type ON blood_stock(type);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_hospital ON orders(hospital_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_rides_user ON ride_requests(user_id);
CREATE INDEX idx_rides_driver ON ride_requests(driver_id);
CREATE INDEX idx_rides_status ON ride_requests(status);
```

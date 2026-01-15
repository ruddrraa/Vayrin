<div align="center">

# 🚑 LifeLine - Blood & Emergency Services Platform

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.39-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)

A comprehensive healthcare platform connecting hospitals, patients, and ambulance drivers for seamless blood ordering and emergency ambulance services.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure) • [API Reference](#-api-reference)

</div>

---

## ✨ Features

### 🏥 For Hospitals
- **Dashboard Management** - Manage hospital operations from a centralized dashboard
- **Blood Inventory** - Add, update, and track blood stock with expiry dates
- **Ambulance Fleet** - Register and manage ambulance fleet with real-time status
- **Driver Management** - Manage driver profiles, wages, and shift schedules
- **Order Processing** - Handle incoming blood orders and track dispatches
- **Toggle Availability** - Open/close hospital operations with one click

### 👤 For Users (Patients)
- **Blood Marketplace** - Browse available blood units from multiple hospitals
- **Smart Cart** - Add items to cart with quantity management
- **Ambulance Booking** - Book emergency ambulances with Uber-like experience
- **Real-time Tracking** - Track ambulance location on interactive map
- **Location Autocomplete** - Search pickup/drop locations with Ola Maps integration
- **Route Visualization** - See optimal route with distance and ETA

### 🚗 For Drivers
- **Ride Requests** - View and accept incoming ride requests
- **Navigation** - Get pickup and drop locations with map directions
- **Status Management** - Toggle between active and off-duty status
- **Ride History** - Track completed rides and earnings

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript 5.8 |
| **Styling** | Tailwind CSS, Framer Motion |
| **Icons** | Lucide React |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime) |
| **Maps** | Ola Maps SDK (MapLibre-based) |
| **Geocoding** | Ola Maps Autocomplete & Directions API |
| **Build Tool** | Vite 6.2 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ 
- **npm** or **yarn**
- **Supabase Account** - [Create one here](https://supabase.com)
- **Ola Maps API Key** - [Get one here](https://maps.olakrutrim.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lifeline.git
   cd lifeline
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OLAMAPS_API_KEY=your_ola_maps_api_key
   ```

4. **Set up Supabase database**
   
   Run these SQL commands in your Supabase SQL Editor:

   ```sql
   -- Profiles table
   CREATE TABLE public.profiles (
     id UUID NOT NULL PRIMARY KEY,
     email TEXT,
     role TEXT,
     name TEXT,
     is_hospital_open BOOLEAN DEFAULT TRUE,
     address TEXT,
     phone TEXT,
     city TEXT,
     CONSTRAINT profiles_id_fkey FOREIGN KEY (id) 
       REFERENCES auth.users (id) ON DELETE CASCADE
   );

   -- Enable RLS
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
   CREATE POLICY "Users can view own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Users can update own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);
   
   CREATE POLICY "Users can insert own profile" ON profiles
     FOR INSERT WITH CHECK (auth.uid() = id);
   ```

   See [docs/DATABASE.md](./docs/DATABASE.md) for complete schema.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
lifeline/
├── components/
│   ├── auth/
│   │   ├── SignInModal.tsx      # Sign in modal component
│   │   ├── SignUpModal.tsx      # Sign up modal component
│   │   └── index.ts             # Auth exports
│   ├── LocationAutocomplete.tsx # Ola Maps location search
│   ├── MapComponent.tsx         # Interactive map with routing
│   └── ui.tsx                   # Reusable UI components
├── context/
│   └── AppContext.tsx           # Global state management
├── lib/
│   └── olaApi.ts                # Ola Maps API wrappers
├── views/
│   ├── LandingPage.tsx          # Homepage with auth
│   ├── UserDashboard.tsx        # Patient dashboard
│   ├── HospitalDashboard.tsx    # Hospital management
│   └── DriverDashboard.tsx      # Driver interface
├── App.tsx                      # Main app with routing
├── index.tsx                    # React entry point
├── types.ts                     # TypeScript interfaces
├── supabaseClient.ts            # Supabase configuration
└── vite.config.ts               # Vite configuration
```

---

## 🗄 Database Schema

### Tables Overview

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with role-based data |
| `ambulances` | Ambulance fleet with status and pricing |
| `drivers` | Driver information and scheduling |
| `blood_stock` | Blood inventory per hospital |
| `orders` | Blood purchase orders |
| `ride_requests` | Ambulance booking requests |

### Key Relationships

```
profiles (1) ──── (n) ambulances
profiles (1) ──── (n) drivers
profiles (1) ──── (n) blood_stock
profiles (1) ──── (n) orders
profiles (1) ──── (n) ride_requests
```

---

## 🗺 API Reference

### Ola Maps Integration

The app uses Ola Maps for:

1. **Autocomplete** - Location search suggestions
   ```typescript
   import { searchPlaces } from './lib/olaApi';
   const results = await searchPlaces('Connaught Place, Delhi');
   ```

2. **Place Details** - Get coordinates from place ID
   ```typescript
   import { getPlaceDetails } from './lib/olaApi';
   const details = await getPlaceDetails('place_id_here');
   ```

3. **Directions** - Route between two points
   ```typescript
   import { getDirections } from './lib/olaApi';
   const route = await getDirections(
     { lat: 28.6139, lng: 77.2090 },
     { lat: 28.5355, lng: 77.2410 }
   );
   ```

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_OLAMAPS_API_KEY` | Ola Maps API key | ✅ |

> ⚠️ **Security Note**: Never commit `.env` files. Use `.env.example` as a template.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Ola Maps](https://maps.olakrutrim.com) - Maps and Geocoding
- [Lucide](https://lucide.dev) - Beautiful icons
- [Framer Motion](https://www.framer.com/motion/) - Animation library

---

<div align="center">

**Made with ❤️ for Healthcare**

</div>

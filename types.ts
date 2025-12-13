
export type Role = 'GUEST' | 'HOSPITAL' | 'USER' | 'DRIVER';

// Global declaration for MapLibre
declare global {
  interface Window {
    maplibregl: any;
  }
}

export interface User {
  id: string;
  name: string; // Changed from name/full_name ambiguity to strict 'name' per schema
  email: string;
  role: Role;
  isHospitalOpen?: boolean; // For hospitals only
  // Profile Fields
  address?: string;
  phone?: string;
  city?: string;
  logoUrl?: string; // Kept for UI, but might not persist if not in DB schema
}

export type AmbulanceStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE';
export type AmbulanceType = 'BASIC' | 'ICU' | 'ADVANCED';

export interface Ambulance {
  id: string;
  hospitalId: string;
  plateNumber: string;
  driverName: string;
  status: AmbulanceStatus;
  location: { lat: number; lng: number };
  heading?: number;
  type: AmbulanceType;
  baseCharge: number;
  pricePerKm: number;
  equipment: string[];
}

export interface Driver {
  id: string;
  hospitalId: string;
  name: string;
  licenseNumber: string;
  contact: string;
  hourlyWage: number;
  status: 'ACTIVE' | 'OFF_DUTY' | 'ON_LEAVE';
  totalHours: number;
}

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface BloodStock {
  id: string;
  hospitalId: string;
  type: BloodType;
  units: number;
  price: number;
  hospitalName: string; 
  expiryDate: string;
  isPaused: boolean;
}

export interface CartItem extends BloodStock {
  quantity: number;
}

export type OrderStatus = 'PROCESSING' | 'DISPATCHED' | 'DELIVERED';

export interface Order {
    id: string;
    userId: string;
    hospitalId: string;
    items: CartItem[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
}

// Updated to match Schema default 'searching'
export type RideStatus = 'searching' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface RideRequest {
  id: string;
  userId: string;
  driverId?: string;
  ambulanceId?: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
  status: RideStatus;
  price: number; // Changed from fare to price per schema
  distance: string;
  duration?: string;
  createdAt: string;
}

export interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvc: string;
}

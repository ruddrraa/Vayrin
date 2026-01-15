
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
  driverName: string; // Legacy field for display
  primaryDriverId?: string | null;
  alternateDriverId?: string | null;
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

// Blood Group Types (matching database enum format)
export type BloodGroup = 'A_POSITIVE' | 'A_NEGATIVE' | 'B_POSITIVE' | 'B_NEGATIVE' | 'AB_POSITIVE' | 'AB_NEGATIVE' | 'O_POSITIVE' | 'O_NEGATIVE';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'; // Legacy UI display
export type RhFactor = '+' | '-';
export type ComponentTypeCode = 'WB' | 'PRBC' | 'FFP' | 'RDP' | 'SDP' | 'CRYO' | 'PC';
export type BatchStatus = 'FRESH' | 'STABLE' | 'NEAR_EXPIRY' | 'CRITICAL_STOCK' | 'URGENT_DISPOSAL' | 'EXPIRED' | 'USED';
export type BloodBankType = 'GOVERNMENT' | 'PRIVATE' | 'NGO' | 'CHARITABLE';

// Blood Bank Details
export interface BloodBankDetails {
  id: string;
  hospitalId: string;
  licenseNumber: string;
  bankType: BloodBankType;
  lastUpdated: string;
  createdAt: string;
}

// Blood Inventory (per blood group)
export interface BloodInventory {
  id: string;
  bloodBankId: string;
  bloodGroup: BloodGroup;
  rhFactor: RhFactor;
  totalUnitsAvailable: number;
  isActive: boolean;
  components?: BloodComponent[];
}

// Blood Component (PRBC, FFP, RDP, etc.)
export interface BloodComponent {
  id: string;
  inventoryId: string;
  typeCode: ComponentTypeCode;
  displayName: string;
  availableUnits: number;
  processingCharge: number;
  currency: string;
  isGovtCapped: boolean;
  isAvailable: boolean;
  batches?: BloodBatch[];
}

// Blood Batch (individual units with expiry)
export interface BloodBatch {
  id: string;
  componentId: string;
  batchId: string;
  quantity: number;
  expiryDate: string;
  status: BatchStatus;
  collectionDate?: string;
  donorId?: string;
  notes?: string;
}

// Component Type Reference
export interface ComponentType {
  code: ComponentTypeCode;
  displayName: string;
  description: string;
  defaultPrice: number;
  shelfLifeDays: number;
  storageTemp: string;
}

// Legacy BloodStock interface (for backward compatibility)
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

// Full Inventory Response (matches test.json structure)
export interface InventoryResponse {
  status: string;
  bloodBankDetails: BloodBankDetails;
  inventorySummary: BloodInventory[];
}

export interface CartItem extends BloodStock {
  quantity: number;
}

// Cart item for new inventory structure
export interface ComponentCartItem {
  component: BloodComponent;
  bloodGroup: BloodGroup;
  quantity: number;
  selectedBatches?: BloodBatch[];
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

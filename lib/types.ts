// Base Appwrite Document type
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

// Enums for status and types
export enum OrderStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum ServiceType {
  LAUNDROMAT = 'laundromat',
  WASH_AND_FOLD = 'wash_and_fold',
  IRONING = 'ironing',
  DRY_CLEANING = 'dry_cleaning'
}

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  STAFF = 'staff',
  OWNER = 'owner'
}

export enum PaymentMethod {
  ONLINE = 'online',
  POS = 'pos',
  TRANSFER = 'transfer',
  CASH = 'cash'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// New enum for delivery type
export enum DeliveryType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery'
}

// Nigerian specific types
export interface NigerianAddress {
  street: string;
  area: string;
  lga: string; // Local Government Area
  state: string; // Should be Lagos State
  landmark?: string;
  postalCode?: string;
}

export interface NigerianPhone {
  number: string; // Format: 0XXXXXXXXXX
  isWhatsApp: boolean;
}

// User Collection
export interface User extends AppwriteDocument {
  email: string;
  firstName: string;
  lastName: string;
  phone: NigerianPhone;
  addresses: NigerianAddress[];
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  totalOrders: number;
  totalSpent: number; // In kobo (Nigerian smallest currency unit)
  loyaltyPoints: number;
  preferredPaymentMethod?: PaymentMethod;
  notes?: string;
  registrationSource: 'web' | 'mobile' | 'referral';
  referredBy?: string; // User ID who referred this user
}

// Services Collection
export interface Service extends AppwriteDocument {
  name: string;
  type: ServiceType;
  description: string;
  basePrice: number; // In kobo
  pricePerKg?: number; // For weight-based services, in kobo
  pricePerItem?: number; // For item-based services, in kobo
  estimatedDuration: number; // In hours
  isActive: boolean;
  availableAreas: string[]; // Lagos areas where service is available
  specialInstructions?: string;
  category: string;
  displayOrder: number;
  minOrderValue?: number; // Minimum order value in kobo
  maxOrderValue?: number; // Maximum order value in kobo
  tags: string[]; // For search and filtering
}

// Orders Collection
export interface Order extends AppwriteDocument {
  orderNumber: string; // Auto-generated unique order number
  customerId: string; // Reference to User
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string; // Payment reference for online payments
  
  // Order details
  items: string[]; // Array of OrderItem IDs
  totalAmount: number; // In kobo
  discountAmount: number; // In kobo
  finalAmount: number; // In kobo
  amountPaid?: number; // In kobo
  
  // Simplified scheduling
  deliveryType: DeliveryType; // NEW: Either pickup or delivery
  requestedDateTime: string; // NEW: Simple date/time request from customer
  confirmedDateTime?: string; // NEW: Confirmed date/time after manual coordination
  actualPickupTime?: string; // ISO date string
  actualDeliveryTime?: string; // ISO date string
  
  // Address (conditional based on delivery type)
  pickupAddress?: NigerianAddress; // Only for delivery orders
  deliveryAddress?: NigerianAddress; // Only for delivery orders
  addressNotes?: string;
  
  // Staff assignment
  assignedStaffId?: string; // Reference to AdminUser
  
  // Additional info
  customerNotes?: string;
  staffNotes?: string;
  specialInstructions?: string;
  
  // Tracking (stored as JSON string in Appwrite)
  orderHistory: string; // JSON string of OrderHistoryEntry[]
  
  // Quality assurance
  customerRating?: number; // 1-5 stars
  customerFeedback?: string;
  photosBeforeService?: string[]; // Photo URLs
  photosAfterService?: string[]; // Photo URLs
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  timestamp: string; // ISO date string
  staffId?: string;
  notes?: string;
}

// OrderItems Collection
export interface OrderItem extends AppwriteDocument {
  orderId: string; // Reference to Order
  serviceId: string; // Reference to Service
  quantity: number;
  weight?: number; // In kilograms
  unitPrice: number; // In kobo
  totalPrice: number; // In kobo
  itemDescription?: string;
  specialInstructions?: string;
  condition?: 'good' | 'damaged' | 'stained' | 'torn';
  beforeServicePhoto?: string;
  afterServicePhoto?: string;
  isCompleted: boolean;
}

// TimeSlots Collection
export interface TimeSlot extends AppwriteDocument {
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
  maxOrders: number; // Maximum orders that can be scheduled in this slot
  currentOrders: number; // Current number of orders scheduled
  serviceAreas: string[]; // Areas covered in this time slot
  slotType: 'pickup' | 'delivery' | 'both';
  isHoliday: boolean;
  staffAssigned?: string[]; // Array of staff IDs assigned to this slot
  notes?: string;
}

// AdminUsers Collection
export interface AdminUser extends AppwriteDocument {
  email: string;
  firstName: string;
  lastName: string;
  phone: NigerianPhone;
  role: UserRole;
  isActive: boolean;
  permissions: string[]; // Array of permission strings
  assignedAreas: string[]; // Lagos areas this staff member covers
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  workingDays: string[]; // Array of days: ['monday', 'tuesday', ...]
  employeeId: string;
  hireDate: string; // ISO date string
  lastLogin?: string; // ISO date string
  totalOrdersHandled: number;
  averageRating?: number; // Customer ratings for this staff member
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
  limit: number;
  offset: number;
}

// Authentication types
export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  phone: string;
  emailVerification: boolean;
  phoneVerification: boolean;
  prefs: Record<string, any>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

// Business logic types
export interface BookingRequest {
  customerId: string;
  services: Array<{
    serviceId: string;
    quantity: number;
    weight?: number;
    specialInstructions?: string;
  }>;
  deliveryType: DeliveryType; // NEW: Either pickup or delivery
  requestedDateTime: string; // NEW: Simple date/time request
  pickupAddress?: NigerianAddress; // Only required for delivery
  deliveryAddress?: NigerianAddress; // Only required for delivery
  customerNotes?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string; // Payment reference for online payments
}

export interface ServiceAvailability {
  serviceId: string;
  isAvailable: boolean;
  nextAvailableSlot?: string;
  estimatedDuration: number;
  areas: string[];
}

// Validation schemas (using Zod)
export interface ValidationError {
  field: string;
  message: string;
}

// Nigerian market specific constants
// Updated to accept local Nigerian phone numbers without country code
export const NIGERIAN_PHONE_REGEX = /^0[789]\d{9}$/;
export const LAGOS_LGAS = [
  'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
  'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
  'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
  'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
];

export const NAIRA_TO_KOBO_MULTIPLIER = 100;
export const KOBO_TO_NAIRA_DIVISOR = 100;
import { z } from 'zod';
import { 
  OrderStatus, 
  ServiceType, 
  UserRole, 
  PaymentMethod, 
  PaymentStatus,
  NIGERIAN_PHONE_REGEX,
  LAGOS_LGAS 
} from './types';

// Nigerian-specific validations
export const nigerianPhoneSchema = z.object({
  number: z.string()
    .regex(NIGERIAN_PHONE_REGEX, 'Invalid Nigerian phone number format. Use 0XXXXXXXXXX')
    .refine((phone) => phone.length === 11, 'Phone number must be exactly 11 characters'),
  isWhatsApp: z.boolean().default(false)
});

export const nigerianAddressSchema = z.object({
  // street: z.string().min(5, 'Street address must be at least 5 characters').max(200),
  // area: z.string().min(2, 'Area is required').max(100),
  // lga: z.enum(LAGOS_LGAS as [string, ...string[]], {
  //   errorMap: () => ({ message: 'Please select a valid Lagos Local Government Area' })
  // }),
  // state: z.literal('Lagos State', {
  //   errorMap: () => ({ message: 'Service is only available in Lagos State' })
  // }),
  // landmark: z.string().max(200).optional(),
  // postalCode: z.string().regex(/^\d{6}$/, 'Postal code must be 6 digits').optional()
});

// Currency validation (kobo)
export const koboAmountSchema = z.number()
  .int('Amount must be a whole number')
  .min(0, 'Amount cannot be negative')
  .max(100000000, 'Amount is too large'); // 1 million naira limit

// Time validation for Nigerian business hours
export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format');

export const dateSchema = z.string().datetime({ message: 'Invalid date format' });

// User Registration Schema
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  phone: z.string()
    .regex(NIGERIAN_PHONE_REGEX, 'Invalid Nigerian phone number format. Use 0XXXXXXXXXX'),
//   addresses: z.array(nigerianAddressSchema).min(1, 'At least one address is required').max(5, 'Maximum 5 addresses allowed'),
//   dateOfBirth: z.string().datetime().optional(),
//   gender: z.enum(['male', 'female', 'other']).optional(),
//   referredBy: z.string().optional()
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

// User Profile Update Schema
export const userUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: nigerianPhoneSchema.optional(),
  addresses: z.array(nigerianAddressSchema).max(5).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  preferredPaymentMethod: z.nativeEnum(PaymentMethod).optional()
});

// Service Schema
export const serviceSchema = z.object({
  name: z.string().min(3, 'Service name must be at least 3 characters').max(100),
  type: z.nativeEnum(ServiceType),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  basePrice: koboAmountSchema,
  pricePerKg: koboAmountSchema.optional(),
  pricePerItem: koboAmountSchema.optional(),
  estimatedDuration: z.number().int().min(1, 'Duration must be at least 1 hour').max(168), // Max 1 week
  isActive: z.boolean().default(true),
  availableAreas: z.array(z.string()).min(1, 'At least one service area is required'),
  specialInstructions: z.string().max(500).optional(),
  category: z.string().min(2).max(50),
  displayOrder: z.number().int().min(0),
  minOrderValue: koboAmountSchema.optional(),
  maxOrderValue: koboAmountSchema.optional(),
  tags: z.array(z.string().max(30)).max(10)
});

// Order Item Schema
export const orderItemSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100),
  weight: z.number().min(0.1).max(50).optional(), // Max 50kg per item
  unitPrice: koboAmountSchema,
  totalPrice: koboAmountSchema,
  itemDescription: z.string().max(200).optional(),
  specialInstructions: z.string().max(300).optional(),
  condition: z.enum(['good', 'damaged', 'stained', 'torn']).default('good')
});

// Order Schema
export const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required').max(20),
  pickupAddress: nigerianAddressSchema,
  deliveryAddress: nigerianAddressSchema,
  pickupTimeSlotId: z.string().min(1, 'Pickup time slot is required'),
  estimatedDeliveryTime: dateSchema,
  customerNotes: z.string().max(500).optional(),
  specialInstructions: z.string().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod)
});

// Time Slot Schema
export const timeSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: timeSchema,
  endTime: timeSchema,
  maxOrders: z.number().int().min(1).max(50),
  serviceAreas: z.array(z.string()).min(1, 'At least one service area is required'),
  slotType: z.enum(['pickup', 'delivery', 'both']),
  isHoliday: z.boolean().default(false),
  staffAssigned: z.array(z.string()).optional(),
  notes: z.string().max(300).optional()
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.startTime}:00`);
  const end = new Date(`2000-01-01T${data.endTime}:00`);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

// Admin User Schema
export const adminUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: nigerianPhoneSchema,
  role: z.nativeEnum(UserRole).refine((role) => role !== UserRole.CUSTOMER, {
    message: 'Role must be admin, staff, or owner'
  }),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  assignedAreas: z.array(z.string()).min(1, 'At least one area must be assigned'),
  workingHours: z.object({
    start: timeSchema,
    end: timeSchema
  }).refine((hours) => {
    const start = new Date(`2000-01-01T${hours.start}:00`);
    const end = new Date(`2000-01-01T${hours.end}:00`);
    return end > start;
  }, {
    message: 'End time must be after start time'
  }),
  workingDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
    .min(1, 'At least one working day is required')
    .max(7),
  employeeId: z.string().min(3, 'Employee ID must be at least 3 characters').max(20),
  hireDate: dateSchema
});

// Booking Request Schema (Updated for simplified system)
export const bookingRequestSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  services: z.array(z.object({
    serviceId: z.string().min(1, 'Service ID is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50),
    weight: z.number().min(0.1).max(50).optional(),
    specialInstructions: z.string().max(300).optional()
  })).min(1, 'At least one service is required').max(10),
  deliveryType: z.enum(['pickup', 'delivery']),
  requestedDateTime: z.string().min(1, 'Requested date/time is required'),
  pickupAddress: nigerianAddressSchema.optional(),
  deliveryAddress: nigerianAddressSchema.optional(),
  customerNotes: z.string().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod)
}).refine((data) => {
  // If delivery type is 'delivery', addresses are required
  if (data.deliveryType === 'delivery') {
    return data.pickupAddress && data.deliveryAddress;
  }
  return true;
}, {
  message: "Pickup and delivery addresses are required for delivery orders",
  path: ["deliveryType"]
});

// Order Status Update Schema
export const orderStatusUpdateSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z.nativeEnum(OrderStatus),
  staffId: z.string().min(1, 'Staff ID is required'),
  notes: z.string().max(500).optional(),
  photosBeforeService: z.array(z.string().url()).max(10).optional(),
  photosAfterService: z.array(z.string().url()).max(10).optional()
});

// Contact Form Schema (for customer support)
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(NIGERIAN_PHONE_REGEX, 'Invalid phone number format').optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
  orderNumber: z.string().optional()
});

// Search and Filter Schemas
export const orderSearchSchema = z.object({
  customerId: z.string().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  area: z.string().optional(),
  assignedStaffId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export const serviceSearchSchema = z.object({
  type: z.nativeEnum(ServiceType).optional(),
  area: z.string().optional(),
  isActive: z.boolean().optional(),
  minPrice: koboAmountSchema.optional(),
  maxPrice: koboAmountSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0)
});

// Utility functions for validation
export const validateNigerianPhone = (phone: string): boolean => {
  return NIGERIAN_PHONE_REGEX.test(phone);
};

export const validateLagosLGA = (lga: string): boolean => {
  return LAGOS_LGAS.includes(lga);
};

export const formatNairaFromKobo = (kobo: number): string => {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(naira);
};

export const convertNairaToKobo = (naira: number): number => {
  return Math.round(naira * 100);
};

export const convertKoboToNaira = (kobo: number): number => {
  return kobo / 100;
};

// Business hours validation
export const isWithinBusinessHours = (time: string, startHour = '08:00', endHour = '20:00'): boolean => {
  const checkTime = new Date(`2000-01-01T${time}:00`);
  const start = new Date(`2000-01-01T${startHour}:00`);
  const end = new Date(`2000-01-01T${endHour}:00`);
  
  return checkTime >= start && checkTime <= end;
};

// Date validation for West Africa Time
export const isValidBookingDate = (dateString: string): boolean => {
  const today = new Date();
  const bookingDate = new Date(dateString);
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 7);
  
  // Reset time to start of day for comparison
  today.setHours(0, 0, 0, 0);
  bookingDate.setHours(0, 0, 0, 0);
  maxDate.setHours(0, 0, 0, 0);
  
  return bookingDate >= today && bookingDate <= maxDate;
};
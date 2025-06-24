import { User, NigerianAddress, NigerianPhone, AdminUser } from './types';

// Appwrite-compatible user structure
export interface AppwriteUser {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isWhatsAppNumber: boolean;
  addresses: string; // JSON string
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  preferredPaymentMethod?: string;
  notes?: string;
  registrationSource: 'web' | 'mobile' | 'referral';
  referredBy?: string;
  role: string;
}

// Appwrite-compatible admin user structure
export interface AppwriteAdminUser {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isWhatsAppNumber: boolean;
  role: string;
  isActive: boolean;
  permissions: string; // JSON string
  assignedAreas: string; // JSON string
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string; // JSON string
  employeeId: string;
  hireDate: string;
  lastLogin?: string;
  totalOrdersHandled: number;
  averageRating?: number;
}

// Convert User to Appwrite format
export function userToAppwrite(user: Partial<User>): Partial<AppwriteUser> {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phone?.number || '',
    isWhatsAppNumber: user.phone?.isWhatsApp || false,
    addresses: JSON.stringify(user.addresses || []),
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    totalOrders: user.totalOrders || 0,
    totalSpent: user.totalSpent || 0,
    loyaltyPoints: user.loyaltyPoints || 0,
    preferredPaymentMethod: user.preferredPaymentMethod,
    notes: user.notes,
    registrationSource: user.registrationSource || 'web',
    referredBy: user.referredBy,
    role: 'customer'
  };
}

// Convert Appwrite format to User
export function appwriteToUser(appwriteUser: any): User {
  let addresses: NigerianAddress[] = [];
  try {
    addresses = typeof appwriteUser.addresses === 'string' 
      ? JSON.parse(appwriteUser.addresses) 
      : [];
  } catch (e) {
    addresses = [];
  }

  const phone: NigerianPhone = {
    number: appwriteUser.phoneNumber || '',
    isWhatsApp: appwriteUser.isWhatsAppNumber || false
  };

  return {
    $id: appwriteUser.$id,
    $createdAt: appwriteUser.$createdAt,
    $updatedAt: appwriteUser.$updatedAt,
    $permissions: appwriteUser.$permissions,
    $collectionId: appwriteUser.$collectionId,
    $databaseId: appwriteUser.$databaseId,
    email: appwriteUser.email,
    firstName: appwriteUser.firstName,
    lastName: appwriteUser.lastName,
    phone,
    addresses,
    dateOfBirth: appwriteUser.dateOfBirth,
    gender: appwriteUser.gender,
    isActive: appwriteUser.isActive,
    emailVerified: appwriteUser.emailVerified,
    phoneVerified: appwriteUser.phoneVerified,
    totalOrders: appwriteUser.totalOrders || 0,
    totalSpent: appwriteUser.totalSpent || 0,
    loyaltyPoints: appwriteUser.loyaltyPoints || 0,
    preferredPaymentMethod: appwriteUser.preferredPaymentMethod,
    notes: appwriteUser.notes,
    registrationSource: appwriteUser.registrationSource || 'web',
    referredBy: appwriteUser.referredBy
  };
}

// Convert AdminUser to Appwrite format
export function adminUserToAppwrite(adminUser: Partial<AdminUser>): Partial<AppwriteAdminUser> {
  return {
    email: adminUser.email,
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    phoneNumber: adminUser.phone?.number || '',
    isWhatsAppNumber: adminUser.phone?.isWhatsApp || false,
    role: adminUser.role || 'staff',
    isActive: adminUser.isActive,
    permissions: JSON.stringify(adminUser.permissions || []),
    assignedAreas: JSON.stringify(adminUser.assignedAreas || []),
    workingHoursStart: adminUser.workingHours?.start || '08:00',
    workingHoursEnd: adminUser.workingHours?.end || '17:00',
    workingDays: JSON.stringify(adminUser.workingDays || []),
    employeeId: adminUser.employeeId || '',
    hireDate: adminUser.hireDate || new Date().toISOString(),
    lastLogin: adminUser.lastLogin,
    totalOrdersHandled: adminUser.totalOrdersHandled || 0,
    averageRating: adminUser.averageRating
  };
}

// Convert Appwrite format to AdminUser
export function appwriteToAdminUser(appwriteAdminUser: any): AdminUser {
  let permissions: string[] = [];
  let assignedAreas: string[] = [];
  let workingDays: string[] = [];

  try {
    permissions = typeof appwriteAdminUser.permissions === 'string' 
      ? JSON.parse(appwriteAdminUser.permissions) 
      : [];
  } catch (e) {
    permissions = [];
  }

  try {
    assignedAreas = typeof appwriteAdminUser.assignedAreas === 'string' 
      ? JSON.parse(appwriteAdminUser.assignedAreas) 
      : [];
  } catch (e) {
    assignedAreas = [];
  }

  try {
    workingDays = typeof appwriteAdminUser.workingDays === 'string' 
      ? JSON.parse(appwriteAdminUser.workingDays) 
      : [];
  } catch (e) {
    workingDays = [];
  }

  const phone: NigerianPhone = {
    number: appwriteAdminUser.phoneNumber || '',
    isWhatsApp: appwriteAdminUser.isWhatsAppNumber || false
  };

  return {
    $id: appwriteAdminUser.$id,
    $createdAt: appwriteAdminUser.$createdAt,
    $updatedAt: appwriteAdminUser.$updatedAt,
    $permissions: appwriteAdminUser.$permissions,
    $collectionId: appwriteAdminUser.$collectionId,
    $databaseId: appwriteAdminUser.$databaseId,
    email: appwriteAdminUser.email,
    firstName: appwriteAdminUser.firstName,
    lastName: appwriteAdminUser.lastName,
    phone,
    role: appwriteAdminUser.role,
    isActive: appwriteAdminUser.isActive,
    permissions,
    assignedAreas,
    workingHours: {
      start: appwriteAdminUser.workingHoursStart || '08:00',
      end: appwriteAdminUser.workingHoursEnd || '17:00'
    },
    workingDays,
    employeeId: appwriteAdminUser.employeeId,
    hireDate: appwriteAdminUser.hireDate,
    lastLogin: appwriteAdminUser.lastLogin,
    totalOrdersHandled: appwriteAdminUser.totalOrdersHandled || 0,
    averageRating: appwriteAdminUser.averageRating
  };
}

// Validation helper for phone numbers
export function validateAndFormatPhone(phone: string): { isValid: boolean; formatted: string } {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it's a valid Nigerian number
  const nigerianRegex = /^\+234[789]\d{9}$/;
  
  if (nigerianRegex.test(cleaned)) {
    return { isValid: true, formatted: cleaned };
  }
  
  // Try to format if it starts with 0 (local format)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    const formatted = '+234' + cleaned.substring(1);
    if (nigerianRegex.test(formatted)) {
      return { isValid: true, formatted };
    }
  }
  
  // Try to format if it's just the number without country code
  if (cleaned.length === 10 && /^[789]/.test(cleaned)) {
    const formatted = '+234' + cleaned;
    if (nigerianRegex.test(formatted)) {
      return { isValid: true, formatted };
    }
  }
  
  return { isValid: false, formatted: phone };
}

// Address validation for Lagos State
export function validateLagosAddress(address: string): { isValid: boolean; lga?: string } {
  const lagosLGAs = [
    'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
    'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaaye',
    'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
    'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
  ];
  
  const lowerAddress = address.toLowerCase();
  const foundLGA = lagosLGAs.find(lga => 
    lowerAddress.includes(lga.toLowerCase())
  );
  
  return {
    isValid: !!foundLGA,
    lga: foundLGA
  };
} 
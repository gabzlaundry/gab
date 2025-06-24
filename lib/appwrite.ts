import { Account, Client, Databases, Storage, Query } from 'appwrite';

// Appwrite configuration
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Configuration constants
export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '',
  collections: {
    users: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || 'users',
    services: process.env.NEXT_PUBLIC_APPWRITE_SERVICES_COLLECTION_ID || 'services',
    orders: process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID || 'orders',
    orderItems: process.env.NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_COLLECTION_ID || 'order-items',
    timeSlots: process.env.NEXT_PUBLIC_APPWRITE_TIME_SLOTS_COLLECTION_ID || 'time-slots',
    adminUsers: process.env.NEXT_PUBLIC_APPWRITE_ADMIN_USERS_COLLECTION_ID || 'admin-users',
  },
  businessConfig: {
    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || '+2348000000000',
    serviceAreas: (process.env.NEXT_PUBLIC_SERVICE_AREAS || '').split(','),
    businessHours: {
      start: process.env.NEXT_PUBLIC_BUSINESS_HOURS_START || '08:00',
      end: process.env.NEXT_PUBLIC_BUSINESS_HOURS_END || '20:00',
    },
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'NGN',
  },
};

// Export Query for database operations
export { Query };
export default client; 
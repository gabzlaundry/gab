# Gab'z Laundromat - Appwrite Setup Guide

## Phase 1: Complete Appwrite Project Setup & Database Schema

This guide will help you set up the complete Appwrite backend infrastructure for Gab'z Laundromat's web application with Nigerian market-specific configurations.

## Prerequisites

- Appwrite Cloud account (https://cloud.appwrite.io) or self-hosted Appwrite instance
- Node.js 18+ installed
- Next.js project with Appwrite SDK installed

## Step 1: Create Appwrite Project

1. Log in to your Appwrite console
2. Click "Create Project"
3. Project Name: `Gab'z Laundromat`
4. Project ID: `gabz-laundromat` (or auto-generated)
5. Copy the Project ID and Endpoint URL

## Step 2: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_APPWRITE_DATABASE_ID=gabz-laundromat-db

# Collection IDs (will be created in Step 4)
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
NEXT_PUBLIC_APPWRITE_SERVICES_COLLECTION_ID=services
NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID=orders
NEXT_PUBLIC_APPWRITE_ORDER_ITEMS_COLLECTION_ID=order-items
NEXT_PUBLIC_APPWRITE_TIME_SLOTS_COLLECTION_ID=time-slots
NEXT_PUBLIC_APPWRITE_ADMIN_USERS_COLLECTION_ID=admin-users

# Nigerian Business Configuration
NEXT_PUBLIC_BUSINESS_PHONE=+2348000000000
NEXT_PUBLIC_SERVICE_AREAS=Lagos Island,Lagos Mainland,Ikeja,Victoria Island,Lekki,Surulere,Yaba,Ikoyi
NEXT_PUBLIC_BUSINESS_HOURS_START=08:00
NEXT_PUBLIC_BUSINESS_HOURS_END=20:00
NEXT_PUBLIC_CURRENCY=NGN
```

## Step 3: Create Database

1. Go to **Databases** in your Appwrite console
2. Click **Create Database**
3. Database ID: `gabz-laundromat-db`
4. Database Name: `Gab'z Laundromat Database`

## Step 4: Create Collections

### Collection 1: Users (Customer Profiles)

**Collection ID:** `users`
**Collection Name:** `Users`

**Attributes:**
- `email` (string, required, 320 chars) - Customer email
- `firstName` (string, required, 50 chars) - First name
- `lastName` (string, required, 50 chars) - Last name
- `phone` (string, required, 500 chars) - Nigerian phone with WhatsApp info (JSON)
- `addresses` (string, required, 2000 chars) - Array of addresses (JSON)
- `dateOfBirth` (datetime, optional) - Date of birth
- `gender` (enum, optional: male, female, other) - Gender
- `isActive` (boolean, required, default: true) - Account status
- `emailVerified` (boolean, required, default: false) - Email verification status
- `phoneVerified` (boolean, required, default: false) - Phone verification status
- `totalOrders` (integer, required, default: 0) - Total number of orders
- `totalSpent` (integer, required, default: 0) - Total spent in kobo
- `loyaltyPoints` (integer, required, default: 0) - Loyalty points
- `preferredPaymentMethod` (enum, optional: online, pos, transfer, cash) - Preferred payment
- `notes` (string, optional, 1000 chars) - Admin notes
- `registrationSource` (enum, required: web, mobile, referral) - Registration source
- `referredBy` (string, optional, 50 chars) - Referrer user ID

**Indexes:**
- `email` (unique)
- `phone` (unique)
- `isActive`
- `totalOrders`

**Permissions:**
- Read: `users` (users can read their own data)
- Create: `any` (public registration)
- Update: `users` (users can update their own data)
- Delete: `admins` (only admins can delete)

### Collection 2: Services (Laundry Services)

**Collection ID:** `services`
**Collection Name:** `Services`

**Attributes:**
- `name` (string, required, 100 chars) - Service name
- `type` (enum, required: laundromat, wash_and_fold, ironing, dry_cleaning) - Service type
- `description` (string, required, 500 chars) - Service description
- `basePrice` (integer, required) - Base price in kobo
- `pricePerKg` (integer, optional) - Price per kg in kobo
- `pricePerItem` (integer, optional) - Price per item in kobo
- `estimatedDuration` (integer, required) - Duration in hours
- `isActive` (boolean, required, default: true) - Service availability
- `availableAreas` (string, required, 1000 chars) - Available areas (JSON array)
- `specialInstructions` (string, optional, 500 chars) - Special instructions
- `category` (string, required, 50 chars) - Service category
- `displayOrder` (integer, required, default: 0) - Display order
- `minOrderValue` (integer, optional) - Minimum order value in kobo
- `maxOrderValue` (integer, optional) - Maximum order value in kobo
- `tags` (string, optional, 300 chars) - Search tags (JSON array)

**Indexes:**
- `type`
- `isActive`
- `displayOrder`
- `category`

**Permissions:**
- Read: `any` (public service catalog)
- Create: `admins` (only admins can create services)
- Update: `admins` (only admins can update services)
- Delete: `admins` (only admins can delete services)

### Collection 3: Orders (Customer Orders)

**Collection ID:** `orders`
**Collection Name:** `Orders`

**Attributes:**
- `orderNumber` (string, required, 20 chars) - Unique order number
- `customerId` (string, required, 50 chars) - Customer ID reference
- `status` (enum, required: pending, confirmed, in_progress, ready, delivered, cancelled) - Order status
- `paymentStatus` (enum, required: pending, paid, failed, refunded) - Payment status
- `paymentMethod` (enum, optional: online, pos, transfer, cash) - Payment method
- `items` (string, required, 1000 chars) - Order item IDs (JSON array)
- `totalAmount` (integer, required) - Total amount in kobo
- `discountAmount` (integer, required, default: 0) - Discount in kobo
- `finalAmount` (integer, required) - Final amount in kobo
- `pickupTimeSlotId` (string, required, 50 chars) - Pickup time slot ID
- `deliveryTimeSlotId` (string, optional, 50 chars) - Delivery time slot ID
- `estimatedPickupTime` (datetime, required) - Estimated pickup time
- `estimatedDeliveryTime` (datetime, required) - Estimated delivery time
- `actualPickupTime` (datetime, optional) - Actual pickup time
- `actualDeliveryTime` (datetime, optional) - Actual delivery time
- `pickupAddress` (string, required, 1000 chars) - Pickup address (JSON)
- `deliveryAddress` (string, required, 1000 chars) - Delivery address (JSON)
- `addressNotes` (string, optional, 500 chars) - Address notes
- `assignedStaffId` (string, optional, 50 chars) - Assigned staff ID
- `customerNotes` (string, optional, 500 chars) - Customer notes
- `staffNotes` (string, optional, 500 chars) - Staff notes
- `specialInstructions` (string, optional, 500 chars) - Special instructions
- `orderHistory` (string, required, 2000 chars) - Order history (JSON array)
- `customerRating` (integer, optional) - Customer rating (1-5)
- `customerFeedback` (string, optional, 1000 chars) - Customer feedback
- `photosBeforeService` (string, optional, 1000 chars) - Before photos (JSON array)
- `photosAfterService` (string, optional, 1000 chars) - After photos (JSON array)

**Indexes:**
- `orderNumber` (unique)
- `customerId`
- `status`
- `paymentStatus`
- `assignedStaffId`
- `$createdAt`

**Permissions:**
- Read: `users` (customers can read their orders), `admins` (admins can read all)
- Create: `users` (customers can create orders)
- Update: `users` (customers can update their orders), `admins` (admins can update all)
- Delete: `admins` (only admins can delete orders)

### Collection 4: Order Items (Individual Order Items)

**Collection ID:** `order-items`
**Collection Name:** `Order Items`

**Attributes:**
- `orderId` (string, required, 50 chars) - Order ID reference
- `serviceId` (string, required, 50 chars) - Service ID reference
- `quantity` (integer, required) - Quantity
- `weight` (float, optional) - Weight in kg
- `unitPrice` (integer, required) - Unit price in kobo
- `totalPrice` (integer, required) - Total price in kobo
- `itemDescription` (string, optional, 200 chars) - Item description
- `specialInstructions` (string, optional, 300 chars) - Special instructions
- `condition` (enum, required: good, damaged, stained, torn, default: good) - Item condition
- `beforeServicePhoto` (string, optional, 255 chars) - Before photo URL
- `afterServicePhoto` (string, optional, 255 chars) - After photo URL
- `isCompleted` (boolean, required, default: false) - Completion status

**Indexes:**
- `orderId`
- `serviceId`
- `isCompleted`

**Permissions:**
- Read: `users` (customers can read their order items), `admins` (admins can read all)
- Create: `users` (customers can create order items)
- Update: `users` (customers can update their items), `admins` (admins can update all)
- Delete: `admins` (only admins can delete order items)

### Collection 5: Time Slots (Scheduling)

**Collection ID:** `time-slots`
**Collection Name:** `Time Slots`

**Attributes:**
- `date` (string, required, 10 chars) - Date in YYYY-MM-DD format
- `startTime` (string, required, 5 chars) - Start time in HH:MM format
- `endTime` (string, required, 5 chars) - End time in HH:MM format
- `isAvailable` (boolean, required, default: true) - Availability status
- `maxOrders` (integer, required) - Maximum orders per slot
- `currentOrders` (integer, required, default: 0) - Current booked orders
- `serviceAreas` (string, required, 500 chars) - Service areas (JSON array)
- `slotType` (enum, required: pickup, delivery, both) - Slot type
- `isHoliday` (boolean, required, default: false) - Holiday flag
- `staffAssigned` (string, optional, 500 chars) - Assigned staff IDs (JSON)
- `notes` (string, optional, 300 chars) - Notes

**Indexes:**
- `date`
- `isAvailable`
- `slotType`
- `startTime`

**Permissions:**
- Read: `any` (public time slot availability)
- Create: `admins` (only admins can create time slots)
- Update: `users` (customers can book slots), `admins` (admins can manage all)
- Delete: `admins` (only admins can delete time slots)

### Collection 6: Admin Users (Staff Management)

**Collection ID:** `admin-users`
**Collection Name:** `Admin Users`

**Attributes:**
- `email` (string, required, 320 chars) - Staff email
- `firstName` (string, required, 50 chars) - First name
- `lastName` (string, required, 50 chars) - Last name
- `phone` (string, required, 500 chars) - Nigerian phone with WhatsApp info (JSON)
- `role` (enum, required: admin, staff, owner) - Staff role
- `isActive` (boolean, required, default: true) - Account status
- `permissions` (string, required, 1000 chars) - Permissions array (JSON)
- `assignedAreas` (string, required, 500 chars) - Assigned areas (JSON)
- `workingHours` (string, required, 100 chars) - Working hours (JSON)
- `workingDays` (string, required, 200 chars) - Working days (JSON)
- `employeeId` (string, required, 20 chars) - Employee ID
- `hireDate` (datetime, required) - Hire date
- `lastLogin` (datetime, optional) - Last login time
- `totalOrdersHandled` (integer, required, default: 0) - Total orders handled
- `averageRating` (float, optional) - Average rating

**Indexes:**
- `email` (unique)
- `employeeId` (unique)
- `role`
- `isActive`

**Permissions:**
- Read: `admins` (only admins can read staff data)
- Create: `admins` (only admins can create staff accounts)
- Update: `admins` (only admins can update staff data)
- Delete: `admins` (only admins can delete staff accounts)

## Step 5: Authentication Setup

1. Go to **Auth** in your Appwrite console
2. Enable **Email/Password** authentication
3. Configure email templates:
   - **Verification Email**: Customize for Gab'z Laundromat branding
   - **Password Recovery**: Customize for Gab'z Laundromat branding
4. Set up redirect URLs:
   - **Success URL**: `http://localhost:3000/dashboard`
   - **Failure URL**: `http://localhost:3000/login?error=true`

## Step 6: Storage Setup (for photos)

1. Go to **Storage** in your Appwrite console
2. Create a new bucket:
   - **Bucket ID**: `order-photos`
   - **Bucket Name**: `Order Photos`
   - **Max File Size**: 5MB
   - **Allowed File Extensions**: jpg, jpeg, png, webp
3. Set permissions:
   - **Read**: `users` (customers can view their photos)
   - **Create**: `users` (customers can upload photos)
   - **Update**: `admins` (only admins can update photos)
   - **Delete**: `admins` (only admins can delete photos)

## Step 7: Create Sample Data

### Sample Services
Use the following data to populate your services collection:

```json
[
  {
    "name": "Regular Wash & Fold",
    "type": "wash_and_fold",
    "description": "Standard washing and folding service for everyday clothes",
    "basePrice": 50000,
    "pricePerKg": 40000,
    "estimatedDuration": 24,
    "isActive": true,
    "availableAreas": ["Lagos Island", "Victoria Island", "Ikoyi", "Lekki"],
    "category": "Standard",
    "displayOrder": 1,
    "tags": ["wash", "fold", "standard", "everyday"]
  },
  {
    "name": "Premium Dry Cleaning",
    "type": "dry_cleaning",
    "description": "Professional dry cleaning for delicate fabrics and formal wear",
    "basePrice": 100000,
    "pricePerItem": 150000,
    "estimatedDuration": 48,
    "isActive": true,
    "availableAreas": ["Lagos Island", "Victoria Island", "Ikoyi", "Lekki", "Ikeja"],
    "category": "Premium",
    "displayOrder": 2,
    "tags": ["dry-clean", "premium", "formal", "delicate"]
  },
  {
    "name": "Express Ironing",
    "type": "ironing",
    "description": "Quick professional ironing service for crisp, neat clothes",
    "basePrice": 30000,
    "pricePerItem": 25000,
    "estimatedDuration": 12,
    "isActive": true,
    "availableAreas": ["Lagos Island", "Victoria Island", "Ikoyi", "Lekki", "Ikeja", "Surulere"],
    "category": "Express",
    "displayOrder": 3,
    "tags": ["iron", "express", "quick", "crisp"]
  }
]
```

### Sample Time Slots
Create time slots for the next 7 days:

```json
[
  {
    "date": "2024-01-15",
    "startTime": "09:00",
    "endTime": "11:00",
    "maxOrders": 10,
    "serviceAreas": ["Lagos Island", "Victoria Island", "Ikoyi"],
    "slotType": "pickup",
    "isHoliday": false
  },
  {
    "date": "2024-01-15",
    "startTime": "14:00",
    "endTime": "16:00",
    "maxOrders": 15,
    "serviceAreas": ["Lekki", "Ikeja", "Surulere"],
    "slotType": "pickup",
    "isHoliday": false
  },
  {
    "date": "2024-01-15",
    "startTime": "17:00",
    "endTime": "19:00",
    "maxOrders": 12,
    "serviceAreas": ["Lagos Island", "Victoria Island", "Ikoyi", "Lekki"],
    "slotType": "delivery",
    "isHoliday": false
  }
]
```

## Step 8: Test Your Setup

1. Install dependencies: `npm install`
2. Start your Next.js app: `npm run dev`
3. Test the connection by checking if the app can connect to Appwrite
4. Test user registration and login functionality
5. Test service retrieval
6. Test order creation flow

## Step 9: Security Checklist

- [ ] All collections have proper permissions set
- [ ] Email/password authentication is enabled
- [ ] Nigerian phone number validation is implemented
- [ ] Lagos State address validation is active
- [ ] All sensitive data is stored in environment variables
- [ ] API rate limiting is configured (if using Appwrite Cloud)
- [ ] Backup strategy is in place

## Step 10: Production Deployment

When deploying to production:

1. Update environment variables with production Appwrite endpoint
2. Configure custom domain for Appwrite (if using cloud)
3. Set up SSL certificates
4. Configure email service provider for authentication emails
5. Set up monitoring and logging
6. Configure backup schedules
7. Test all functionality in production environment

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Check collection permissions
2. **Invalid Document**: Verify attribute types match your data
3. **Connection Issues**: Verify project ID and endpoint
4. **Authentication Errors**: Check email/password settings

### Nigerian Market Specific:

1. **Phone Number Validation**: Ensure +234 format is enforced
2. **Address Validation**: Verify Lagos LGA list is up to date
3. **Currency Handling**: Always store amounts in kobo (smallest unit)
4. **Time Zone**: Ensure all times are in West Africa Time (WAT)

## Next Steps

After completing this setup, you'll be ready to move to Phase 2: Customer-Facing UI & Booking System. Your foundation will include:

✅ Complete Appwrite project configuration
✅ All database collections with proper schemas
✅ Authentication system setup
✅ Nigerian market-specific validations
✅ Core data operations functionality
✅ Sample data for testing

This foundation provides a solid base for the laundromat service that can scale to handle multiple customers across Lagos State with proper order management and staff assignment capabilities.
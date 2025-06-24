# Gab'z Laundromat - Lagos Premier Laundry Service

## 🧺 About Gab'z Laundromat

Gab'z Laundromat is a modern laundry service web application built specifically for the Lagos State market in Nigeria. Our platform provides convenient online booking, order tracking, and seamless payment processing for busy professionals, entrepreneurs, and Gen Z customers.

**Mission**: Prioritize convenience through seamless online booking, order tracking, and payment processes while serving the Greater Lagos Area.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (React Framework) with TypeScript
- **Backend**: Appwrite (Backend-as-a-Service)
- **Database**: Appwrite Database with collections for users, services, orders, and admin management
- **Authentication**: Appwrite Auth with email/password
- **Styling**: Tailwind CSS
- **Payment Gateway**: Paystack (Nigerian payment gateway) - *Coming in Phase 3*
- **Notifications**: WhatsApp integration - *Coming in Phase 5*

## 📱 Features (Phase 1 Complete)

### ✅ Core Foundation - COMPLETED
- **Complete Appwrite Integration**: Full backend setup with database collections
- **Authentication System**: Customer and admin login/registration with role-based access
- **Nigerian Market Validation**: Phone number (+234), Lagos LGA validation, Naira currency (kobo)
- **Database Schema**: 6 collections with proper relationships and permissions
- **TypeScript Types**: Comprehensive type definitions for all data models
- **Order Management**: Complete order lifecycle from creation to delivery
- **Service Management**: CRUD operations for laundry services
- **Time Slot Booking**: Scheduling system for pickup and delivery
- **User Profile Management**: Customer and admin profile handling

### 🔜 Upcoming Phases
- **Phase 2**: Customer-facing UI with booking interface
- **Phase 3**: Paystack payment integration
- **Phase 4**: Admin dashboard for order management
- **Phase 5**: WhatsApp notifications and final deployment

## 🏗️ Architecture

This is a **full-stack Next.js application** using Appwrite as the backend service:
- **Frontend**: Next.js React components and pages
- **Backend**: Appwrite handles database, authentication, file storage
- **Integration**: Next.js communicates directly with Appwrite SDK
- **No separate backend server needed** - Appwrite provides all backend functionality

## 🇳🇬 Nigerian Market Features

- **Phone Number Validation**: Enforces Nigerian format (+234XXXXXXXXX)
- **Address Validation**: Lagos State LGAs only
- **Currency Handling**: Naira stored as kobo (smallest unit)
- **Time Zone**: West Africa Time (WAT) support
- **Service Areas**: Lagos Island, Victoria Island, Ikoyi, Lekki, Ikeja, Surulere, Yaba, and more
- **Business Hours**: 8:00 AM - 8:00 PM operational hours

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ installed
- Appwrite Cloud account or self-hosted instance
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd gabz-laundromat
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the project root:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_APPWRITE_DATABASE_ID=gabz-laundromat-db

# Collection IDs
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

### 4. Appwrite Setup
Follow the comprehensive setup guide in [`docs/appwrite-setup.md`](docs/appwrite-setup.md) to:
- Create your Appwrite project
- Set up database collections
- Configure authentication
- Set proper permissions
- Add sample data

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
gabz-laundromat/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with AuthProvider
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── lib/                   # Core library files
│   ├── appwrite.ts        # Appwrite client configuration
│   ├── auth.ts            # Authentication service
│   ├── database.ts        # Database operations service
│   ├── types.ts           # TypeScript type definitions
│   ├── validations.ts     # Zod validation schemas
│   ├── utils.ts           # Utility functions
│   └── context/           # React context providers
│       └── AuthContext.tsx # Authentication context
├── docs/                  # Documentation
│   └── appwrite-setup.md  # Complete Appwrite setup guide
├── components.json        # UI components configuration
└── package.json          # Dependencies and scripts
```

## 🔧 Core Services

### Authentication Service (`lib/auth.ts`)
- Customer registration and login
- Admin authentication with role-based access
- Password reset and email verification
- Session management

### Database Service (`lib/database.ts`)
- Service management (CRUD operations)
- Order creation and status tracking
- Time slot booking and availability
- User profile management
- Nigerian market-specific calculations

### Validation Service (`lib/validations.ts`)
- Nigerian phone number validation
- Lagos State address validation
- Currency handling (Naira to Kobo conversion)
- Business hours and date validation

## 🗄️ Database Collections

1. **Users**: Customer profiles with Nigerian addresses and phone numbers
2. **Services**: Laundry services (Wash & Fold, Dry Cleaning, Ironing, etc.)
3. **Orders**: Complete order management with status tracking
4. **Order Items**: Individual items within each order
5. **Time Slots**: Scheduling system for pickup and delivery
6. **Admin Users**: Staff and owner access management

## 🧪 Testing

### Test Authentication
```bash
# Register a new customer
# Login with customer credentials
# Test admin login (requires admin user creation)
```

### Test Services
```bash
# Fetch available services
# Test service filtering by area
# Test service creation (admin only)
```

### Test Orders
```bash
# Create a new order
# Update order status
# Test order history tracking
```

## 🚀 API Usage Examples

### Customer Registration
```typescript
import { authService } from '@/lib/auth';

const result = await authService.registerCustomer({
  email: 'customer@example.com',
  password: 'SecurePass123',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+2348012345678'
});
```

### Create Order
```typescript
import { databaseService } from '@/lib/database';

const order = await databaseService.createOrder({
  customerId: 'user-id',
  services: [
    {
      serviceId: 'service-id',
      quantity: 2,
      weight: 3.5
    }
  ],
  pickupAddress: {
    street: '123 Awolowo Road',
    area: 'Ikoyi',
    lga: 'Lagos Island',
    state: 'Lagos State'
  },
  deliveryAddress: {
    street: '456 Victoria Island',
    area: 'Victoria Island',
    lga: 'Eti Osa',
    state: 'Lagos State'
  },
  pickupTimeSlotId: 'slot-id',
  preferredDeliveryDate: '2024-01-20',
  paymentMethod: 'online'
});
```

## 🔒 Security Features

- **Role-based Access Control**: Customer vs Admin permissions
- **Nigerian Market Validation**: Phone and address verification
- **Input Sanitization**: All inputs validated with Zod schemas
- **Environment Variables**: Sensitive data properly secured
- **Authentication Required**: Protected routes for admin functions

## 🌟 Nigerian Market Specifics

### Service Areas (Lagos State)
- Lagos Island
- Lagos Mainland
- Ikeja
- Victoria Island
- Lekki
- Surulere
- Yaba
- Ikoyi
- And other Lagos LGAs

### Pricing Structure
- Stored in kobo (Nigerian smallest currency unit)
- Automatic Naira formatting for display
- Weight-based and item-based pricing options

### Phone Number Format
- Validates Nigerian mobile numbers (+234)
- WhatsApp integration support
- SMS notification ready

## ✅ Phase 1 Checklist (Complete)

- [x] Appwrite project setup and configuration
- [x] Database collections with proper schemas
- [x] TypeScript types for all data models
- [x] Authentication system (customer and admin)
- [x] Core database operations
- [x] Nigerian market validations
- [x] Order management system
- [x] Service management
- [x] Time slot booking system
- [x] React context for auth state management
- [x] Comprehensive documentation

## ✅ Phase 2 Checklist (Complete)

- [x] **Homepage Design**: Modern homepage with blue branding and Nigerian context
- [x] **Authentication Pages**: Customer login and registration with Nigerian phone validation
- [x] **Service Catalog**: Searchable services with filtering by type and area
- [x] **Customer Dashboard**: Order tracking, stats, and quick actions
- [x] **Booking Interface**: 3-step booking flow (Services → Schedule → Payment)
- [x] **Mobile Responsive**: Touch-friendly interface with mobile-first design
- [x] **User Experience**: Loading states, error handling, and progressive validation

## ✅ Phase 3 Checklist (Complete)

- [x] **Admin Authentication**: Staff login portal with role-based access control
- [x] **Admin Dashboard**: Comprehensive overview with order statistics and quick actions
- [x] **Order Management**: Complete order lifecycle tracking with status updates and filtering
- [x] **Customer Management**: Customer profiles with spending analytics and tier system
- [x] **Real-time Updates**: Live order status changes and dashboard refresh functionality
- [x] **Nigerian Business Logic**: Lagos-specific customer insights and revenue tracking
- [x] **Admin Interface**: Professional staff portal with navigation and user management

## 🔜 Next Steps (Phase 4)

1. **Payment Integration**: Paystack payment gateway for Nigerian market
2. **SMS Notifications**: Order updates via Nigerian mobile networks  
3. **Advanced Analytics**: Revenue reports and business intelligence dashboards
4. **Service Management**: Dynamic pricing and availability controls
5. **Customer Loyalty**: Points system and referral rewards program
6. **Production Deployment**: Vercel deployment with Appwrite cloud hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For technical support or business inquiries:
- Email: support@gabzlaundromat.com
- Phone: +234800000000
- Address: Lagos State, Nigeria

## 📄 License

This project is proprietary software. All rights reserved.

---

**Gab'z Laundromat** - Bringing convenience to your doorstep across Lagos State! 🧺✨

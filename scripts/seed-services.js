// Seed script to populate services in Appwrite database
// Run this to add sample services for testing

const { Client, Databases, ID } = require('node-appwrite');

// Configuration - Update these with your actual Appwrite details
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'; // Your Appwrite endpoint
const APPWRITE_PROJECT_ID = '68513d6a003494f862e4'; // Your project ID
const APPWRITE_API_KEY = 'your-api-key-here'; // Your API key
const DATABASE_ID = '68513d6a0034dd8c4bd5'; // Your database ID
const SERVICES_COLLECTION_ID = '68513f76003e093a3a1a'; // Your services collection ID

// Initialize Appwrite
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Sample services to create
const sampleServices = [
  {
    name: 'Basic Wash & Fold',
    type: 'wash_and_fold',
    description: 'Professional washing, drying, and folding service for everyday clothing',
    basePrice: 150000, // ₦1,500 in kobo
    pricePerKg: 50000,  // ₦500 per kg in kobo
    estimatedDuration: 24,
    isActive: true,
    availableAreas: ['Ikeja', 'Victoria Island', 'Lekki', 'Surulere', 'Yaba'],
    category: 'Basic Services',
    displayOrder: 1,
    minOrderValue: 100000, // ₦1,000 in kobo
    maxOrderValue: 5000000, // ₦50,000 in kobo
    tags: ['wash', 'fold', 'basic', 'everyday'],
    specialInstructions: 'Standard wash and fold service. Items will be washed, dried, and neatly folded.'
  },
  {
    name: 'Premium Dry Cleaning',
    type: 'dry_cleaning',
    description: 'Professional dry cleaning for delicate fabrics and formal wear',
    basePrice: 300000, // ₦3,000 in kobo
    pricePerItem: 200000, // ₦2,000 per item in kobo
    estimatedDuration: 48,
    isActive: true,
    availableAreas: ['Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja GRA'],
    category: 'Premium Services',
    displayOrder: 2,
    minOrderValue: 200000, // ₦2,000 in kobo
    maxOrderValue: 10000000, // ₦100,000 in kobo
    tags: ['dry-clean', 'premium', 'formal', 'delicate'],
    specialInstructions: 'Suitable for suits, dresses, silk, wool, and other delicate fabrics.'
  },
  {
    name: 'Express Laundry',
    type: 'wash_and_fold',
    description: 'Same-day laundry service for urgent needs',
    basePrice: 250000, // ₦2,500 in kobo
    pricePerKg: 75000,  // ₦750 per kg in kobo
    estimatedDuration: 8,
    isActive: true,
    availableAreas: ['Victoria Island', 'Lekki', 'Ikeja'],
    category: 'Express Services',
    displayOrder: 3,
    minOrderValue: 150000, // ₦1,500 in kobo
    maxOrderValue: 3000000, // ₦30,000 in kobo
    tags: ['express', 'same-day', 'urgent', 'fast'],
    specialInstructions: 'Same-day service available for orders placed before 12 PM.'
  },
  {
    name: 'Professional Ironing',
    type: 'ironing',
    description: 'Expert ironing and pressing service for crisp, professional appearance',
    basePrice: 100000, // ₦1,000 in kobo
    pricePerItem: 15000, // ₦150 per item in kobo
    estimatedDuration: 12,
    isActive: true,
    availableAreas: ['Ikeja', 'Victoria Island', 'Surulere', 'Yaba', 'Lekki'],
    category: 'Specialized Services',
    displayOrder: 4,
    minOrderValue: 50000, // ₦500 in kobo
    maxOrderValue: 2000000, // ₦20,000 in kobo
    tags: ['ironing', 'pressing', 'professional', 'crisp'],
    specialInstructions: 'Items will be professionally pressed for a crisp, wrinkle-free finish.'
  },
  {
    name: 'Laundromat Self-Service',
    type: 'laundromat',
    description: 'Access to our self-service laundromat with high-quality machines',
    basePrice: 80000, // ₦800 in kobo
    pricePerItem: 50000, // ₦500 per load in kobo
    estimatedDuration: 3,
    isActive: true,
    availableAreas: ['Ikeja', 'Surulere'],
    category: 'Self-Service',
    displayOrder: 5,
    minOrderValue: 50000, // ₦500 in kobo
    maxOrderValue: 1000000, // ₦10,000 in kobo
    tags: ['self-service', 'laundromat', 'DIY', 'machines'],
    specialInstructions: 'Bring your own detergent or purchase at our facility.'
  }
];

async function seedServices() {
  try {
    console.log('Starting to seed services...');
    
    // First, let's check if any services already exist
    try {
      const existingServices = await databases.listDocuments(
        DATABASE_ID,
        SERVICES_COLLECTION_ID
      );
      
      if (existingServices.documents.length > 0) {
        console.log(`Found ${existingServices.documents.length} existing services:`);
        existingServices.documents.forEach(service => {
          console.log(`- ${service.name} (ID: ${service.$id})`);
        });
        
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question('Do you want to continue and add more services? (y/n): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y') {
          console.log('Cancelled seeding process.');
          return;
        }
      }
    } catch (error) {
      // If we can't list services, the collection might be empty or there might be permission issues
      console.log('Could not check existing services, proceeding with seeding...');
    }

    // Create the sample services
    for (const serviceData of sampleServices) {
      try {
        const service = await databases.createDocument(
          DATABASE_ID,
          SERVICES_COLLECTION_ID,
          ID.unique(),
          serviceData
        );
        
        console.log(`✅ Created service: ${service.name} (ID: ${service.$id})`);
      } catch (error) {
        console.error(`❌ Failed to create service: ${serviceData.name}`, error.message);
      }
    }
    
    console.log('\n🎉 Seeding completed!');
    console.log('\nYou can now use these services in your booking system.');
    
  } catch (error) {
    console.error('❌ Error seeding services:', error);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  seedServices();
}

module.exports = { seedServices, sampleServices }; 
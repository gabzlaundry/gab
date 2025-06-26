import { ID, Query } from 'appwrite';
import { databases, appwriteConfig } from './appwrite';
import {
  User,
  Service,
  Order,
  OrderItem,
  TimeSlot,
  AdminUser,
  BookingRequest,
  OrderStatus,
  PaymentStatus,
  ServiceType,
  ApiResponse,
  PaginatedResponse,
  OrderHistoryEntry,
  UserRole
} from './types';
import {
  serviceSchema,
  orderSchema,
  timeSlotSchema,
  bookingRequestSchema,
  orderStatusUpdateSchema,
  formatNairaFromKobo,
  convertNairaToKobo
} from './validations';

// Database service for Gab'z Laundromat
export class DatabaseService {

  // ============ SERVICES MANAGEMENT ============

  // Create a new service
  async createService(serviceData: Omit<Service, keyof import('appwrite').Models.Document>): Promise<ApiResponse<Service>> {
    try {
      const validationResult = serviceSchema.safeParse(serviceData);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      const service = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.services,
        ID.unique(),
        serviceData
      ) as Service;

      return {
        success: true,
        data: service
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create service'
      };
    }
  }

  // Get all active services
  async getActiveServices(area?: string): Promise<ApiResponse<Service[]>> {
    try {
      const queries = [
        Query.equal('isActive', true),
        Query.orderAsc('displayOrder')
      ];

      if (area) {
        queries.push(Query.contains('availableAreas', area));
      }

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.services,
        queries
      );

      return {
        success: true,
        data: response.documents as Service[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch services'
      };
    }
  }

  // Get services by type
  async getServicesByType(type: ServiceType, area?: string): Promise<ApiResponse<Service[]>> {
    try {
      const queries = [
        Query.equal('type', type),
        Query.equal('isActive', true),
        Query.orderAsc('displayOrder')
      ];

      if (area) {
        queries.push(Query.contains('availableAreas', area));
      }

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.services,
        queries
      );

      return {
        success: true,
        data: response.documents as Service[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch services by type'
      };
    }
  }

  // Update service
  async updateService(serviceId: string, updates: Partial<Service>): Promise<ApiResponse<Service>> {
    try {
      const service = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.services,
        serviceId,
        updates
      ) as Service;

      return {
        success: true,
        data: service
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update service'
      };
    }
  }

  private _parseOrderAddresses(order: Order): Order {
    const parsedOrder = { ...order };

    if (parsedOrder.pickupAddress && typeof parsedOrder.pickupAddress === 'string') {
      try {
        parsedOrder.pickupAddress = JSON.parse(parsedOrder.pickupAddress);
      } catch (e) {
        console.error(`Failed to parse pickupAddress for order ${parsedOrder.$id}:`, e);
      }
    }

    if (parsedOrder.deliveryAddress && typeof parsedOrder.deliveryAddress === 'string') {
      try {
        parsedOrder.deliveryAddress = JSON.parse(parsedOrder.deliveryAddress);
      } catch (e) {
        console.error(`Failed to parse deliveryAddress for order ${parsedOrder.$id}:`, e);
      }
    }

    return parsedOrder;
  }

  // ============ TIME SLOTS MANAGEMENT ============

  // Create time slots for a date
  async createTimeSlots(slotsData: Omit<TimeSlot, keyof import('appwrite').Models.Document>[]): Promise<ApiResponse<TimeSlot[]>> {
    try {
      const createdSlots: TimeSlot[] = [];

      for (const slotData of slotsData) {
        const validationResult = timeSlotSchema.safeParse(slotData);
        if (!validationResult.success) {
          return {
            success: false,
            error: `Invalid slot data: ${validationResult.error.errors[0].message}`
          };
        }

        const slot = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.timeSlots,
          ID.unique(),
          {
            ...slotData,
            currentOrders: 0,
            isAvailable: true
          }
        ) as TimeSlot;

        createdSlots.push(slot);
      }

      return {
        success: true,
        data: createdSlots
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create time slots'
      };
    }
  }

  // Get available time slots for a date and area
  async getAvailableTimeSlots(date: string, area: string, slotType: 'pickup' | 'delivery' | 'both' = 'both'): Promise<ApiResponse<TimeSlot[]>> {
    try {
      const queries = [
        Query.equal('date', date),
        Query.equal('isAvailable', true),
        Query.contains('serviceAreas', area),
        Query.orderAsc('startTime')
      ];

      if (slotType !== 'both') {
        queries.push(Query.equal('slotType', slotType));
      }

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.timeSlots,
        queries
      );

      // Filter slots where currentOrders < maxOrders
      const availableSlots = (response.documents as TimeSlot[]).filter(
        slot => slot.currentOrders < slot.maxOrders
      );

      return {
        success: true,
        data: availableSlots
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch available time slots'
      };
    }
  }

  // Book a time slot
  async bookTimeSlot(slotId: string): Promise<ApiResponse<TimeSlot>> {
    try {
      // Get current slot data
      const slot = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.timeSlots,
        slotId
      ) as TimeSlot;

      if (slot.currentOrders >= slot.maxOrders) {
        return {
          success: false,
          error: 'Time slot is fully booked'
        };
      }

      // Update slot with incremented order count
      const updatedSlot = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.timeSlots,
        slotId,
        {
          currentOrders: slot.currentOrders + 1,
          isAvailable: slot.currentOrders + 1 < slot.maxOrders
        }
      ) as TimeSlot;

      return {
        success: true,
        data: updatedSlot
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to book time slot'
      };
    }
  }

  // ============ ORDERS MANAGEMENT ============

  // Create order from booking request
  async createOrder(bookingData: BookingRequest): Promise<ApiResponse<Order>> {
    try {
      const validationResult = bookingRequestSchema.safeParse(bookingData);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error.errors[0].message
        };
      }

      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // Calculate total amount
      let totalAmount = 0;
      const orderItems: Omit<OrderItem, keyof import('appwrite').Models.Document>[] = [];

      for (const item of bookingData.services) {
        const serviceResponse = await this.getServiceById(item.serviceId);
        if (!serviceResponse.success || !serviceResponse.data) {
          return {
            success: false,
            error: `Service not found: ${item.serviceId}`
          };
        }

        const service = serviceResponse.data;
        let unitPrice = service.basePrice;

        // Add weight-based pricing if applicable
        if (item.weight && service.pricePerKg) {
          unitPrice += service.pricePerKg * item.weight;
        }

        // Use per-item pricing if available
        if (service.pricePerItem) {
          unitPrice = service.pricePerItem;
        }

        const itemTotalPrice = unitPrice * item.quantity;
        totalAmount += itemTotalPrice;

        orderItems.push({
          serviceId: item.serviceId,
          quantity: item.quantity,
          weight: item.weight,
          unitPrice,
          totalPrice: itemTotalPrice,
          specialInstructions: item.specialInstructions,
          condition: 'good',
          isCompleted: false
        });
      }

      // Create order
      const orderData: any = {
        orderNumber,
        customerId: bookingData.customerId,
        status: OrderStatus.PENDING,
        paymentStatus: 'pending',
        paymentMethod: bookingData.paymentMethod,
        paymentReference: bookingData.paymentReference,
        items: [], // Will be populated after creating order items
        totalAmount,
        discountAmount: 0,
        finalAmount: totalAmount,
        deliveryType: bookingData.deliveryType,
        requestedDateTime: bookingData.requestedDateTime,
        contactNumber: bookingData.contactNumber,
        customerNotes: bookingData.customerNotes,
        // Convert orderHistory to JSON string for Appwrite storage
        orderHistory: JSON.stringify([{
          status: OrderStatus.PENDING,
          timestamp: new Date().toISOString(),
          notes: 'Order created'
        }])
      };

      if (bookingData.deliveryType === 'delivery') {
        if (bookingData.pickupAddress) {
          orderData.pickupAddress = JSON.stringify(bookingData.pickupAddress);
        }
        if (bookingData.deliveryAddress) {
          orderData.deliveryAddress = JSON.stringify(bookingData.deliveryAddress);
        }
      }

      // Create the order
      const order = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        ID.unique(),
        orderData
      ) as Order;

      // Create order items
      const createdOrderItems: string[] = [];
      for (const itemData of orderItems) {
        const orderItem = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.orderItems,
          ID.unique(),
          {
            ...itemData,
            orderId: order.$id
          }
        ) as OrderItem;
        createdOrderItems.push(orderItem.$id);
      }

      // Update order with item IDs
      const updatedOrder = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        order.$id,
        {
          items: createdOrderItems
        }
      ) as Order;

      return {
        success: true,
        data: this._parseOrderAddresses(updatedOrder),
        message: `Order ${orderNumber} created successfully`
      };

    } catch (error: any) {
      console.error('Order creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create order'
      };
    }
  }

  // Get orders for a customer
  async getCustomerOrders(customerId: string, limit: number = 20, offset: number = 0): Promise<ApiResponse<PaginatedResponse<Order>>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        [
          Query.equal('customerId', customerId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset)
        ]
      );

      return {
        success: true,
        data: {
          documents: response.documents.map(o => this._parseOrderAddresses(o as Order)),
          total: response.total,
          limit,
          offset
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch customer orders'
      };
    }
  }

  // Get order by ID with items
  async getOrderById(orderId: string): Promise<ApiResponse<{order: Order, items: OrderItem[]}>> {
    try {
      // Get order
      const order = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        orderId
      ) as Order;

      // Get order items
      const itemsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orderItems,
        [Query.equal('orderId', orderId)]
      );

      return {
        success: true,
        data: {
          order: this._parseOrderAddresses(order),
          items: itemsResponse.documents as OrderItem[]
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch order details'
      };
    }
  }

  // Update order status
  async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    staffId: string, 
    notes?: string
  ): Promise<ApiResponse<Order>> {
    try {
      // Get current order
      const order = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        orderId
      ) as Order;

      // Parse existing order history from JSON string
      let orderHistory: OrderHistoryEntry[] = [];
      try {
        orderHistory = JSON.parse(order.orderHistory || '[]');
      } catch (e) {
        console.warn('Could not parse order history, starting fresh');
        orderHistory = [];
      }

      // Create new history entry
      const historyEntry: OrderHistoryEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        staffId,
        notes
      };

      // Add new entry to history
      orderHistory.push(historyEntry);

      // Update order
      const updatedOrder = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        orderId,
        {
          status: newStatus,
          orderHistory: JSON.stringify(orderHistory), // Convert back to JSON string
          assignedStaffId: staffId,
          ...(newStatus === OrderStatus.READY && { actualPickupTime: new Date().toISOString() }),
          ...(newStatus === OrderStatus.DELIVERED && { actualDeliveryTime: new Date().toISOString() })
        }
      ) as Order;

      return {
        success: true,
        data: this._parseOrderAddresses(updatedOrder),
        message: `Order status updated to ${newStatus}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update order status'
      };
    }
  }

  // Update order payment status
  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentReference?: string,
    amountPaid?: number
  ): Promise<ApiResponse<Order>> {
    try {
      console.log('🔄 updateOrderPaymentStatus called with:', {
        orderId,
        paymentStatus,
        paymentReference,
        amountPaid
      });

      const updateData: Partial<Order> = {
        paymentStatus,
        ...(paymentReference && { paymentReference }),
        ...(amountPaid && { amountPaid })
      };

      console.log('📋 Update data:', updateData);
      console.log('🔍 Database config:', {
        databaseId: appwriteConfig.databaseId,
        ordersCollection: appwriteConfig.collections.orders
      });

      const updatedOrder = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        orderId,
        updateData
      ) as Order;

      console.log('✅ Payment status update successful:', {
        orderId: updatedOrder.$id,
        newPaymentStatus: updatedOrder.paymentStatus,
        orderNumber: updatedOrder.orderNumber
      });

      return {
        success: true,
        data: this._parseOrderAddresses(updatedOrder),
        message: `Payment status updated to ${paymentStatus}`
      };
    } catch (error: any) {
      console.error('❌ Payment status update failed:', {
        orderId,
        paymentStatus,
        error: error.message,
        errorCode: error.code,
        errorType: error.type
      });
      
      return {
        success: false,
        error: `Failed to update payment status: ${error.message}`
      };
    }
  }

  // Get orders by status
  async getOrdersByStatus(status: OrderStatus, limit: number = 50): Promise<ApiResponse<Order[]>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        [
          Query.equal('status', status),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return {
        success: true,
        data: response.documents.map(o => this._parseOrderAddresses(o as Order))
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch orders by status'
      };
    }
  }

  // Get all orders (admin only)
  async getAllOrders(limit: number = 100): Promise<ApiResponse<Order[]>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return {
        success: true,
        data: response.documents.map(o => this._parseOrderAddresses(o as Order))
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch all orders'
      };
    }
  }

  // Get orders for a specific date
  async getOrdersByDate(date: string): Promise<ApiResponse<Order[]>> {
    try {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        [
          Query.greaterThanEqual('$createdAt', startDate.toISOString()),
          Query.lessThan('$createdAt', endDate.toISOString()),
          Query.orderDesc('$createdAt')
        ]
      );

      return {
        success: true,
        data: response.documents.map(o => this._parseOrderAddresses(o as Order))
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch orders by date'
      };
    }
  }

  // ============ USER MANAGEMENT ============

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const user = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        userId,
        updates
      ) as User;

      return {
        success: true,
        data: user
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update user profile'
      };
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<ApiResponse<{
    totalOrders: number;
    totalSpent: number;
    loyaltyPoints: number;
    completedOrders: number;
  }>> {
    try {
      const user = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        userId
      ) as User;

      // Get completed orders count
      const completedOrders = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        [
          Query.equal('customerId', userId),
          Query.equal('status', OrderStatus.DELIVERED)
        ]
      );

      return {
        success: true,
        data: {
          totalOrders: user.totalOrders,
          totalSpent: user.totalSpent,
          loyaltyPoints: user.loyaltyPoints,
          completedOrders: completedOrders.total
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch user statistics'
      };
    }
  }

  // Get all users (admin only)
  async getAllUsers(limit: number = 100): Promise<ApiResponse<User[]>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return {
        success: true,
        data: response.documents as User[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch users'
      };
    }
  }

  // Get all admin users (owner only)
  async getAllAdminUsers(limit: number = 100): Promise<ApiResponse<AdminUser[]>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return {
        success: true,
        data: response.documents as AdminUser[]
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch admin users'
      };
    }
  }

  // Get orders by customer ID
  async getOrdersByCustomer(customerId: string, limit: number = 50): Promise<ApiResponse<Order[]>> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.collections.orders,
        [
          Query.equal('customerId', customerId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return {
        success: true,
        data: response.documents.map(o => this._parseOrderAddresses(o as Order))
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch customer orders'
      };
    }
  }

  // ============ UTILITY METHODS ============

  // Generate unique order number
  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `GAB${year}${month}${day}${timestamp}`;
  }

  // Calculate delivery time based on service type and current workload
  async calculateEstimatedDelivery(
    services: Array<{serviceId: string, quantity: number}>,
    pickupDate: string
  ): Promise<ApiResponse<{estimatedHours: number, deliveryDate: string}>> {
    try {
      let totalEstimatedHours = 0;

      for (const serviceRequest of services) {
        const service = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.collections.services,
          serviceRequest.serviceId
        ) as Service;

        totalEstimatedHours += service.estimatedDuration * serviceRequest.quantity;
      }

      // Add buffer time based on current workload
      const pickupDateObj = new Date(pickupDate);
      const ordersOnDate = await this.getOrdersByDate(pickupDate);
      const workloadFactor = ordersOnDate.data?.length || 0;
      const bufferHours = Math.min(workloadFactor * 2, 24); // Max 24 hours buffer

      const finalEstimatedHours = totalEstimatedHours + bufferHours;
      const deliveryDate = new Date(pickupDateObj);
      deliveryDate.setHours(deliveryDate.getHours() + finalEstimatedHours);

      return {
        success: true,
        data: {
          estimatedHours: finalEstimatedHours,
          deliveryDate: deliveryDate.toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to calculate estimated delivery'
      };
    }
  }

  // Get service by ID
  async getServiceById(serviceId: string): Promise<ApiResponse<Service>> {
    try {
      const service = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.services,
        serviceId
      ) as Service;

      return {
        success: true,
        data: service
      };
    } catch (error: any) {
      console.error(`Service not found: ${serviceId}`, error);
      return {
        success: false,
        error: `Service with ID ${serviceId} not found`
      };
    }
  }

  // Create admin user (staff registration)
  async createAdminUser(adminData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: { number: string; isWhatsApp: boolean };
    role: UserRole;
    isActive: boolean;
    permissions: string[];
    assignedAreas: string[];
    workingHours: { start: string; end: string };
    workingDays: string[];
    employeeId: string;
    hireDate: string;
  }): Promise<ApiResponse<AdminUser>> {
    try {
      // Convert AdminUser data to Appwrite-compatible format
      const appwriteData = {
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        phoneNumber: adminData.phone.number,
        isWhatsAppNumber: adminData.phone.isWhatsApp,
        role: adminData.role,
        isActive: adminData.isActive,
        permissions: JSON.stringify(adminData.permissions),
        assignedAreas: JSON.stringify(adminData.assignedAreas),
        workingHoursStart: adminData.workingHours.start,
        workingHoursEnd: adminData.workingHours.end,
        workingDays: JSON.stringify(adminData.workingDays),
        employeeId: adminData.employeeId,
        hireDate: adminData.hireDate,
        totalOrdersHandled: 0,
        averageRating: 0
      };

      const adminUserDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        ID.unique(),
        appwriteData
      );

      // Convert back to AdminUser format for response
      const formattedAdminUser: AdminUser = {
        $id: adminUserDoc.$id,
        $createdAt: adminUserDoc.$createdAt,
        $updatedAt: adminUserDoc.$updatedAt,
        $permissions: adminUserDoc.$permissions,
        $collectionId: adminUserDoc.$collectionId,
        $databaseId: adminUserDoc.$databaseId,
        ...adminData,
        lastLogin: undefined,
        totalOrdersHandled: 0,
        averageRating: 0
      };

      return {
        success: true,
        data: formattedAdminUser,
        message: 'Staff member created successfully'
      };
    } catch (error: any) {
      console.error('Failed to create admin user:', error);
      return {
        success: false,
        error: error.message || 'Failed to create staff member'
      };
    }
  }

  // Delete admin user (staff deletion)
  async deleteAdminUser(adminUserId: string): Promise<ApiResponse<null>> {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        adminUserId
      );

      return {
        success: true,
        data: null,
        message: 'Staff member deleted successfully'
      };
    } catch (error: any) {
      console.error('Failed to delete admin user:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete staff member'
      };
    }
  }

  // Update admin user
  async updateAdminUser(adminUserId: string, updates: Partial<AdminUser>): Promise<ApiResponse<AdminUser>> {
    try {
      // Convert updates to Appwrite format
      const appwriteUpdates: any = {};
      
      if (updates.firstName) appwriteUpdates.firstName = updates.firstName;
      if (updates.lastName) appwriteUpdates.lastName = updates.lastName;
      if (updates.email) appwriteUpdates.email = updates.email;
      if (updates.phone) {
        appwriteUpdates.phoneNumber = updates.phone.number;
        appwriteUpdates.isWhatsAppNumber = updates.phone.isWhatsApp;
      }
      if (updates.role) appwriteUpdates.role = updates.role;
      if (updates.isActive !== undefined) appwriteUpdates.isActive = updates.isActive;
      if (updates.permissions) appwriteUpdates.permissions = JSON.stringify(updates.permissions);
      if (updates.assignedAreas) appwriteUpdates.assignedAreas = JSON.stringify(updates.assignedAreas);
      if (updates.workingHours) {
        appwriteUpdates.workingHoursStart = updates.workingHours.start;
        appwriteUpdates.workingHoursEnd = updates.workingHours.end;
      }
      if (updates.workingDays) appwriteUpdates.workingDays = JSON.stringify(updates.workingDays);
      if (updates.employeeId) appwriteUpdates.employeeId = updates.employeeId;
      if (updates.hireDate) appwriteUpdates.hireDate = updates.hireDate;
      if (updates.totalOrdersHandled !== undefined) appwriteUpdates.totalOrdersHandled = updates.totalOrdersHandled;
      if (updates.averageRating !== undefined) appwriteUpdates.averageRating = updates.averageRating;

      const updatedDoc = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.adminUsers,
        adminUserId,
        appwriteUpdates
      );

      // Convert back to AdminUser format
      const updatedAdminUser: AdminUser = {
        $id: updatedDoc.$id,
        $createdAt: updatedDoc.$createdAt,
        $updatedAt: updatedDoc.$updatedAt,
        $permissions: updatedDoc.$permissions,
        $collectionId: updatedDoc.$collectionId,
        $databaseId: updatedDoc.$databaseId,
        email: updatedDoc.email,
        firstName: updatedDoc.firstName,
        lastName: updatedDoc.lastName,
        phone: {
          number: updatedDoc.phoneNumber || '',
          isWhatsApp: updatedDoc.isWhatsAppNumber || false
        },
        role: updatedDoc.role,
        isActive: updatedDoc.isActive,
        permissions: JSON.parse(updatedDoc.permissions || '[]'),
        assignedAreas: JSON.parse(updatedDoc.assignedAreas || '[]'),
        workingHours: {
          start: updatedDoc.workingHoursStart || '08:00',
          end: updatedDoc.workingHoursEnd || '17:00'
        },
        workingDays: JSON.parse(updatedDoc.workingDays || '[]'),
        employeeId: updatedDoc.employeeId,
        hireDate: updatedDoc.hireDate,
        lastLogin: updatedDoc.lastLogin,
        totalOrdersHandled: updatedDoc.totalOrdersHandled || 0,
        averageRating: updatedDoc.averageRating
      };

      return {
        success: true,
        data: updatedAdminUser,
        message: 'Staff member updated successfully'
      };
    } catch (error: any) {
      console.error('Failed to update admin user:', error);
      return {
        success: false,
        error: error.message || 'Failed to update staff member'
      };
    }
  }
}

// Create and export instance
export const databaseService = new DatabaseService();
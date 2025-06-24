import { databaseService } from './database';
import { Order, OrderStatus, User, Service } from './types';
import { ApiResponse } from './types';

export interface BusinessMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  completionRate: number;
  customerRetentionRate: number;
}

export interface RevenueAnalytics {
  daily: Array<{ date: string; revenue: number; orders: number }>;
  weekly: Array<{ week: string; revenue: number; orders: number }>;
  monthly: Array<{ month: string; revenue: number; orders: number }>;
  yearToDate: number;
}

export interface CustomerAnalytics {
  newCustomers: number;
  returningCustomers: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    totalSpent: number;
    totalOrders: number;
  }>;
  customersByArea: Array<{
    area: string;
    count: number;
    revenue: number;
  }>;
}

export interface ServiceAnalytics {
  popularServices: Array<{
    serviceId: string;
    serviceName: string;
    orderCount: number;
    revenue: number;
  }>;
  servicesByArea: Array<{
    area: string;
    services: Array<{
      serviceName: string;
      count: number;
    }>;
  }>;
  averageServiceTime: number;
}

export interface OperationalMetrics {
  ordersByStatus: Array<{
    status: OrderStatus;
    count: number;
    percentage: number;
  }>;
  averageProcessingTime: number;
  pickupDeliveryMetrics: {
    onTimePickups: number;
    onTimeDeliveries: number;
    totalPickups: number;
    totalDeliveries: number;
  };
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    ordersHandled: number;
    averageCompletionTime: number;
    customerRating: number;
  }>;
}

export interface PeriodFilter {
  startDate: string;
  endDate: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export class AnalyticsService {
  
  // Get overall business metrics
  async getBusinessMetrics(filter: PeriodFilter): Promise<ApiResponse<BusinessMetrics>> {
    try {
      // Get all orders within date range
      const ordersResponse = await databaseService.getOrdersByDateRange(
        filter.startDate,
        filter.endDate
      );

      if (!ordersResponse.success || !ordersResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch orders data'
        };
      }

      const orders = ordersResponse.data;
      const completedOrders = orders.filter(order => 
        order.status === OrderStatus.DELIVERED
      );

      // Get unique customers
      const customersResponse = await databaseService.getAllUsers();
      const totalCustomers = customersResponse.success && customersResponse.data 
        ? customersResponse.data.filter(user => user.role === 'customer').length 
        : 0;

      // Calculate metrics
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.finalAmount, 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

      // Calculate customer retention (customers with more than 1 order)
      const customerOrderCounts = new Map<string, number>();
      orders.forEach(order => {
        const count = customerOrderCounts.get(order.customerId) || 0;
        customerOrderCounts.set(order.customerId, count + 1);
      });

      const returningCustomers = Array.from(customerOrderCounts.values())
        .filter(count => count > 1).length;
      const customerRetentionRate = totalCustomers > 0 
        ? (returningCustomers / totalCustomers) * 100 
        : 0;

      return {
        success: true,
        data: {
          totalRevenue,
          totalOrders,
          totalCustomers,
          averageOrderValue,
          completionRate,
          customerRetentionRate
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate business metrics'
      };
    }
  }

  // Get revenue analytics
  async getRevenueAnalytics(filter: PeriodFilter): Promise<ApiResponse<RevenueAnalytics>> {
    try {
      const ordersResponse = await databaseService.getOrdersByDateRange(
        filter.startDate,
        filter.endDate
      );

      if (!ordersResponse.success || !ordersResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch orders data'
        };
      }

      const orders = ordersResponse.data.filter(order => 
        order.status === OrderStatus.DELIVERED
      );

      // Group by period
      const revenueByPeriod = new Map<string, { revenue: number; orders: number }>();

      orders.forEach(order => {
        const orderDate = new Date(order.$createdAt);
        let periodKey: string;

        switch (filter.period) {
          case 'daily':
            periodKey = orderDate.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(orderDate);
            weekStart.setDate(orderDate.getDate() - orderDate.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'yearly':
            periodKey = orderDate.getFullYear().toString();
            break;
          default:
            periodKey = orderDate.toISOString().split('T')[0];
        }

        const existing = revenueByPeriod.get(periodKey) || { revenue: 0, orders: 0 };
        revenueByPeriod.set(periodKey, {
          revenue: existing.revenue + order.finalAmount,
          orders: existing.orders + 1
        });
      });

      // Convert to arrays
      const daily = Array.from(revenueByPeriod.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate year-to-date revenue
      const currentYear = new Date().getFullYear();
      const yearToDate = orders
        .filter(order => new Date(order.$createdAt).getFullYear() === currentYear)
        .reduce((sum, order) => sum + order.finalAmount, 0);

      return {
        success: true,
        data: {
          daily,
          weekly: daily, // For simplicity, using same data structure
          monthly: daily,
          yearToDate
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate revenue analytics'
      };
    }
  }

  // Get customer analytics
  async getCustomerAnalytics(filter: PeriodFilter): Promise<ApiResponse<CustomerAnalytics>> {
    try {
      const ordersResponse = await databaseService.getOrdersByDateRange(
        filter.startDate,
        filter.endDate
      );

      const customersResponse = await databaseService.getAllUsers();

      if (!ordersResponse.success || !customersResponse.success) {
        return {
          success: false,
          error: 'Failed to fetch data'
        };
      }

      const orders = ordersResponse.data || [];
      const customers = customersResponse.data?.filter(user => user.role === 'customer') || [];

      // Calculate customer metrics
      const customerStats = new Map<string, {
        name: string;
        totalSpent: number;
        totalOrders: number;
        firstOrderDate: string;
        area: string;
      }>();

      orders.forEach(order => {
        const customer = customers.find(c => c.$id === order.customerId);
        if (customer) {
          const existing = customerStats.get(order.customerId) || {
            name: `${customer.firstName} ${customer.lastName}`,
            totalSpent: 0,
            totalOrders: 0,
            firstOrderDate: order.$createdAt,
            area: this.extractAreaFromAddress(order.pickupAddress)
          };

          customerStats.set(order.customerId, {
            ...existing,
            totalSpent: existing.totalSpent + order.finalAmount,
            totalOrders: existing.totalOrders + 1,
            firstOrderDate: order.$createdAt < existing.firstOrderDate 
              ? order.$createdAt 
              : existing.firstOrderDate
          });
        }
      });

      // Calculate new vs returning customers
      const filterStartDate = new Date(filter.startDate);
      const newCustomers = Array.from(customerStats.values())
        .filter(customer => new Date(customer.firstOrderDate) >= filterStartDate).length;
      const returningCustomers = Array.from(customerStats.values())
        .filter(customer => customer.totalOrders > 1).length;

      // Top customers
      const topCustomers = Array.from(customerStats.entries())
        .map(([customerId, data]) => ({
          customerId,
          name: data.name,
          totalSpent: data.totalSpent,
          totalOrders: data.totalOrders
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Customers by area
      const areaStats = new Map<string, { count: number; revenue: number }>();
      Array.from(customerStats.values()).forEach(customer => {
        const existing = areaStats.get(customer.area) || { count: 0, revenue: 0 };
        areaStats.set(customer.area, {
          count: existing.count + 1,
          revenue: existing.revenue + customer.totalSpent
        });
      });

      const customersByArea = Array.from(areaStats.entries())
        .map(([area, data]) => ({ area, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        success: true,
        data: {
          newCustomers,
          returningCustomers,
          topCustomers,
          customersByArea
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate customer analytics'
      };
    }
  }

  // Get service analytics
  async getServiceAnalytics(filter: PeriodFilter): Promise<ApiResponse<ServiceAnalytics>> {
    try {
      const ordersResponse = await databaseService.getOrdersByDateRange(
        filter.startDate,
        filter.endDate
      );

      const servicesResponse = await databaseService.getActiveServices();

      if (!ordersResponse.success || !servicesResponse.success) {
        return {
          success: false,
          error: 'Failed to fetch data'
        };
      }

      const orders = ordersResponse.data || [];
      const services = servicesResponse.data || [];

      // Calculate service popularity
      const serviceStats = new Map<string, { count: number; revenue: number; serviceName: string }>();

      orders.forEach(order => {
        order.items.forEach(item => {
          const service = services.find(s => s.$id === item.serviceId);
          if (service) {
            const existing = serviceStats.get(item.serviceId) || {
              count: 0,
              revenue: 0,
              serviceName: service.name
            };

            serviceStats.set(item.serviceId, {
              count: existing.count + item.quantity,
              revenue: existing.revenue + (item.price * item.quantity),
              serviceName: service.name
            });
          }
        });
      });

      const popularServices = Array.from(serviceStats.entries())
        .map(([serviceId, data]) => ({
          serviceId,
          serviceName: data.serviceName,
          orderCount: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.orderCount - a.orderCount);

      // Services by area
      const areaServiceStats = new Map<string, Map<string, number>>();
      
      orders.forEach(order => {
        const area = this.extractAreaFromAddress(order.pickupAddress);
        if (!areaServiceStats.has(area)) {
          areaServiceStats.set(area, new Map());
        }
        
        const areaStats = areaServiceStats.get(area)!;
        order.items.forEach(item => {
          const service = services.find(s => s.$id === item.serviceId);
          if (service) {
            const count = areaStats.get(service.name) || 0;
            areaStats.set(service.name, count + item.quantity);
          }
        });
      });

      const servicesByArea = Array.from(areaServiceStats.entries())
        .map(([area, serviceMap]) => ({
          area,
          services: Array.from(serviceMap.entries())
            .map(([serviceName, count]) => ({ serviceName, count }))
            .sort((a, b) => b.count - a.count)
        }));

      // Calculate average service time (mock data for now)
      const averageServiceTime = 48; // 48 hours average

      return {
        success: true,
        data: {
          popularServices,
          servicesByArea,
          averageServiceTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate service analytics'
      };
    }
  }

  // Get operational metrics
  async getOperationalMetrics(filter: PeriodFilter): Promise<ApiResponse<OperationalMetrics>> {
    try {
      const ordersResponse = await databaseService.getOrdersByDateRange(
        filter.startDate,
        filter.endDate
      );

      if (!ordersResponse.success || !ordersResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch orders data'
        };
      }

      const orders = ordersResponse.data;

      // Orders by status
      const statusCounts = new Map<OrderStatus, number>();
      orders.forEach(order => {
        const count = statusCounts.get(order.status) || 0;
        statusCounts.set(order.status, count + 1);
      });

      const ordersByStatus = Array.from(statusCounts.entries())
        .map(([status, count]) => ({
          status,
          count,
          percentage: (count / orders.length) * 100
        }));

      // Calculate average processing time
      const completedOrders = orders.filter(order => order.status === OrderStatus.DELIVERED);
      const processingTimes = completedOrders.map(order => {
        const startTime = new Date(order.$createdAt).getTime();
        const endTime = new Date(order.$updatedAt).getTime();
        return (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
      });

      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Mock pickup/delivery metrics (would need additional tracking in real app)
      const pickupDeliveryMetrics = {
        onTimePickups: Math.floor(orders.length * 0.92), // 92% on-time rate
        onTimeDeliveries: Math.floor(orders.length * 0.89), // 89% on-time rate
        totalPickups: orders.length,
        totalDeliveries: completedOrders.length
      };

      // Mock staff performance (would need staff tracking in real app)
      const staffPerformance = [
        {
          staffId: 'staff1',
          staffName: 'John Doe',
          ordersHandled: Math.floor(orders.length * 0.3),
          averageCompletionTime: averageProcessingTime * 0.9,
          customerRating: 4.8
        },
        {
          staffId: 'staff2',
          staffName: 'Jane Smith',
          ordersHandled: Math.floor(orders.length * 0.4),
          averageCompletionTime: averageProcessingTime * 1.1,
          customerRating: 4.6
        },
        {
          staffId: 'staff3',
          staffName: 'Mike Johnson',
          ordersHandled: Math.floor(orders.length * 0.3),
          averageCompletionTime: averageProcessingTime,
          customerRating: 4.7
        }
      ];

      return {
        success: true,
        data: {
          ordersByStatus,
          averageProcessingTime,
          pickupDeliveryMetrics,
          staffPerformance
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate operational metrics'
      };
    }
  }

  // Export data to CSV
  async exportAnalytics(
    type: 'revenue' | 'customers' | 'services' | 'operations',
    filter: PeriodFilter
  ): Promise<ApiResponse<string>> {
    try {
      let csvData = '';
      
      switch (type) {
        case 'revenue':
          const revenueData = await this.getRevenueAnalytics(filter);
          if (revenueData.success && revenueData.data) {
            csvData = 'Date,Revenue,Orders\n';
            revenueData.data.daily.forEach(item => {
              csvData += `${item.date},${item.revenue},${item.orders}\n`;
            });
          }
          break;
          
        case 'customers':
          const customerData = await this.getCustomerAnalytics(filter);
          if (customerData.success && customerData.data) {
            csvData = 'Customer Name,Total Spent,Total Orders\n';
            customerData.data.topCustomers.forEach(customer => {
              csvData += `${customer.name},${customer.totalSpent},${customer.totalOrders}\n`;
            });
          }
          break;
          
        case 'services':
          const serviceData = await this.getServiceAnalytics(filter);
          if (serviceData.success && serviceData.data) {
            csvData = 'Service Name,Order Count,Revenue\n';
            serviceData.data.popularServices.forEach(service => {
              csvData += `${service.serviceName},${service.orderCount},${service.revenue}\n`;
            });
          }
          break;
          
        case 'operations':
          const operationsData = await this.getOperationalMetrics(filter);
          if (operationsData.success && operationsData.data) {
            csvData = 'Order Status,Count,Percentage\n';
            operationsData.data.ordersByStatus.forEach(status => {
              csvData += `${status.status},${status.count},${status.percentage.toFixed(2)}%\n`;
            });
          }
          break;
      }

      return {
        success: true,
        data: csvData
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to export analytics data'
      };
    }
  }

  // Helper method to extract area from address
  private extractAreaFromAddress(address: string): string {
    const lagosAreas = [
      'Lagos Island', 'Victoria Island', 'Ikoyi', 'Lekki', 'Ikeja', 
      'Surulere', 'Yaba', 'Apapa', 'Mushin', 'Agege'
    ];
    
    const lowerAddress = address.toLowerCase();
    const area = lagosAreas.find(area => 
      lowerAddress.includes(area.toLowerCase())
    );
    
    return area || 'Other';
  }

  // Generate business report
  async generateBusinessReport(filter: PeriodFilter): Promise<ApiResponse<{
    metrics: BusinessMetrics;
    revenue: RevenueAnalytics;
    customers: CustomerAnalytics;
    services: ServiceAnalytics;
    operations: OperationalMetrics;
    insights: string[];
  }>> {
    try {
      const [metrics, revenue, customers, services, operations] = await Promise.all([
        this.getBusinessMetrics(filter),
        this.getRevenueAnalytics(filter),
        this.getCustomerAnalytics(filter),
        this.getServiceAnalytics(filter),
        this.getOperationalMetrics(filter)
      ]);

      if (!metrics.success || !revenue.success || !customers.success || 
          !services.success || !operations.success) {
        return {
          success: false,
          error: 'Failed to generate complete business report'
        };
      }

      // Generate insights
      const insights: string[] = [];
      
      if (metrics.data!.completionRate > 90) {
        insights.push('🎉 Excellent completion rate! Your operations are running smoothly.');
      } else if (metrics.data!.completionRate < 70) {
        insights.push('⚠️ Completion rate needs improvement. Consider reviewing operational processes.');
      }

      if (customers.data!.returningCustomers / customers.data!.newCustomers > 0.5) {
        insights.push('👥 Strong customer loyalty! More than half of your customers are returning.');
      }

      if (services.data!.popularServices.length > 0) {
        const topService = services.data!.popularServices[0];
        insights.push(`🧺 "${topService.serviceName}" is your most popular service with ${topService.orderCount} orders.`);
      }

      if (operations.data!.averageProcessingTime < 24) {
        insights.push('⚡ Fast processing times! Orders are completed quickly.');
      }

      return {
        success: true,
        data: {
          metrics: metrics.data!,
          revenue: revenue.data!,
          customers: customers.data!,
          services: services.data!,
          operations: operations.data!,
          insights
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate business report'
      };
    }
  }
}

// Create and export instance
export const analyticsService = new AnalyticsService(); 
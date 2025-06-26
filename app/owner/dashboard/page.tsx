'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { databaseService } from '@/lib/database';
import { User, AdminUser, Order, OrderStatus, Service, ServiceType, UserRole } from '@/lib/types';
import { formatNairaFromKobo, convertNairaToKobo } from '@/lib/validations';
import { authService } from '@/lib/auth';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';
import Link from 'next/link';
import { Navbar } from '@/components/ui/navbar';
import { toast } from 'sonner';

// Interface for customer with calculated stats
interface CustomerWithStats extends User {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  status: 'active' | 'inactive';
}

// Interface for staff with calculated stats
interface StaffWithStats extends AdminUser {
  ordersHandled: number;
  performance: number;
  status: 'active' | 'on-leave' | 'inactive';
}

export default function OwnerDashboard() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Real data states
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [staff, setStaff] = useState<StaffWithStats[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    activeCustomers: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    customerSatisfaction: 4.8,
    totalStaff: 0,
    activeStaff: 0
  });

  // Service management states
  const [showCreateService, setShowCreateService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    type: ServiceType.WASH_AND_FOLD,
    description: '',
    basePrice: '',
    pricePerKg: '',
    pricePerItem: '',
    estimatedDuration: '',
    category: '',
    displayOrder: '',
    availableAreas: [] as string[],
    tags: [] as string[],
    specialInstructions: '',
    isActive: true
  });

  // Customer details states
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  
  // Staff details states
  const [selectedStaff, setSelectedStaff] = useState<StaffWithStats | null>(null);
  const [showStaffDetails, setShowStaffDetails] = useState(false);

  // Staff registration states
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: UserRole.STAFF,
    employeeId: '',
    hireDate: new Date().toISOString().split('T')[0],
    permissions: [] as string[],
    assignedAreas: [] as string[],
    workingHours: {
      start: '08:00',
      end: '17:00'
    },
    workingDays: [] as string[]
  });

  // Staff deletion states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const availablePermissions = [
    'view_orders',
    'manage_orders',
    'view_customers',
    'manage_customers',
    'view_services',
    'manage_services',
    'view_reports',
    'manage_staff'
  ];

  const workingDaysOptions = [
    'monday', 'tuesday', 'wednesday', 'thursday', 
    'friday', 'saturday', 'sunday'
  ];

  const lagosAreas = [
    'Ajah', 'Abraham Adesanya', 'Sangotedo', 'United Estate', 'GRA', 'Fara park Estate', 
    'Thomas Estate', 'Ibeju lekki', 'Awoyaya', 'Ogidan', 'Eleko', 'Dangote refinery', 
    'Lagos Island', 'Lagos Mainland', 'Ikeja', 'Victoria Island', 'Lekki', 'Surulere', 
    'Yaba', 'Ikoyi'
  ];

  // Helper function to get service type icons
  const getServiceIcon = (type: ServiceType): string => {
    switch (type) {
      case ServiceType.WASH_AND_FOLD:
        return '🧺';
      case ServiceType.DRY_CLEANING:
        return '👔';
      case ServiceType.IRONING:
        return '🔥';
      case ServiceType.LAUNDROMAT:
        return '⚡';
      default:
        return '🧺';
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is an owner
    if (!user) {
      router.push('/owner/login');
      return;
    }

    if (!userRole || userRole !== UserRole.OWNER) {
      router.push('/login');
      return;
    }

    setIsLoading(false);
    
    // Load real data here
    loadDashboardData();
  }, [user, userRole, router]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load customers data
      await loadCustomersData();
      
      // Load staff data
      await loadStaffData();
      
      // Load orders data
      await loadOrdersData();
      
      // Load services data
      await loadServicesData();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomersData = async () => {
    try {
      console.log('🔄 Loading customers data...');
      
      // Increase limit to get more users and add debugging
      const customersResponse = await databaseService.getAllUsers(500); // Increased from default 100
      console.log('👥 Customers response:', {
        success: customersResponse.success,
        dataLength: customersResponse.data?.length || 0,
        error: customersResponse.error || 'none'
      });
      
      if (customersResponse.success && customersResponse.data) {
        // All users in the users collection are customers by default
        const customerUsers = customersResponse.data;
        console.log('📋 Raw customer users:', customerUsers.length);
        
        // Get order statistics for each customer
        const customersWithStats = await Promise.all(
          customerUsers.map(async (customer): Promise<CustomerWithStats> => {
            const ordersResponse = await databaseService.getOrdersByCustomer(customer.$id);
            
            let totalOrders = 0;
            let totalSpent = 0;
            let lastOrderDate: string | undefined;
            
            if (ordersResponse.success && ordersResponse.data) {
              totalOrders = ordersResponse.data.length;
              totalSpent = ordersResponse.data.reduce((sum, order) => sum + order.finalAmount, 0);
              
              // Find most recent order
              if (ordersResponse.data.length > 0) {
                const sortedOrders = ordersResponse.data.sort((a, b) => 
                  new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
                );
                lastOrderDate = sortedOrders[0].$createdAt;
              }
            }
            
            // Determine if customer is active (ordered in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const isActive = lastOrderDate ? new Date(lastOrderDate) > thirtyDaysAgo : false;
            
            return {
              ...customer,
              totalOrders,
              totalSpent,
              lastOrderDate,
              status: isActive ? 'active' : 'inactive'
            };
          })
        );
        
        console.log('📊 Customers with stats:', {
          total: customersWithStats.length,
          active: customersWithStats.filter(c => c.status === 'active').length,
          inactive: customersWithStats.filter(c => c.status === 'inactive').length,
          sampleCustomers: customersWithStats.slice(0, 3).map(c => ({
            name: `${c.firstName} ${c.lastName}`,
            email: c.email,
            totalOrders: c.totalOrders,
            status: c.status
          }))
        });
        
        setCustomers(customersWithStats);
        
        // Update stats
        const activeCustomers = customersWithStats.filter(c => c.status === 'active').length;
        setStats(prev => ({ ...prev, activeCustomers }));
      } else {
        console.error('❌ Failed to load customers:', customersResponse.error);
        toast.error('Failed to load customers data');
      }
    } catch (error) {
      console.error('❌ Failed to load customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const loadStaffData = async () => {
    try {
      const staffResponse = await databaseService.getAllAdminUsers();
      if (staffResponse.success && staffResponse.data) {
        const staffWithStats: StaffWithStats[] = staffResponse.data.map(member => ({
          ...member,
          ordersHandled: member.totalOrdersHandled || 0,
          performance: member.averageRating || 4.5,
          status: member.isActive ? 'active' : 'inactive'
        }));
        
        setStaff(staffWithStats);
        
        // Update stats
        const activeStaff = staffWithStats.filter(s => s.status === 'active').length;
        setStats(prev => ({ 
          ...prev, 
          totalStaff: staffWithStats.length,
          activeStaff 
        }));
      }
    } catch (error) {
      console.error('Failed to load staff:', error);
    }
  };

  const loadOrdersData = async () => {
    try {
      console.log('🔄 Loading orders data for owner dashboard...');
      
      // First, try to get just pending orders to test the connection
      console.log('🧪 Testing database connection with pending orders...');
      const testResponse = await databaseService.getOrdersByStatus(OrderStatus.PENDING, 5);
      console.log('🧪 Test response:', {
        success: testResponse.success,
        dataLength: testResponse.data?.length || 0,
        error: testResponse.error || 'none'
      });
      
      // Load recent orders (all statuses, sorted by creation date)
      const allOrdersResponse = await Promise.all([
        databaseService.getOrdersByStatus(OrderStatus.PENDING, 100),
        databaseService.getOrdersByStatus(OrderStatus.PICKED_UP, 100),
        databaseService.getOrdersByStatus(OrderStatus.CONFIRMED, 100),
        databaseService.getOrdersByStatus(OrderStatus.IN_PROGRESS, 100),
        databaseService.getOrdersByStatus(OrderStatus.READY, 100),
        databaseService.getOrdersByStatus(OrderStatus.DELIVERED, 100),
        databaseService.getOrdersByStatus(OrderStatus.CANCELLED, 100)
      ]);

      // Combine all orders and sort by creation date (most recent first)
      const allOrders: Order[] = [];
      allOrdersResponse.forEach((response, index) => {
        const statusNames = ['PENDING', 'PICKED_UP', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];
        console.log(`📋 ${statusNames[index]} orders:`, response.success ? response.data?.length || 0 : 'Error');
        
        if (response.success && response.data) {
          allOrders.push(...response.data);
        }
      });

      // Sort by creation date and take the 10 most recent
      const sortedOrders = allOrders.sort((a, b) => 
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
      );
      
      console.log('📊 Owner Dashboard - Orders loaded:', {
        totalOrders: allOrders.length,
        recentOrders: sortedOrders.slice(0, 10).length,
        orderStatuses: {
          pending: allOrders.filter(o => o.status === OrderStatus.PENDING).length,
          inProgress: allOrders.filter(o => o.status === OrderStatus.IN_PROGRESS).length,
          ready: allOrders.filter(o => o.status === OrderStatus.READY).length,
          delivered: allOrders.filter(o => o.status === OrderStatus.DELIVERED).length,
        },
        mostRecentOrder: sortedOrders[0] ? {
          orderNumber: sortedOrders[0].orderNumber,
          status: sortedOrders[0].status,
          createdAt: sortedOrders[0].$createdAt
        } : null
      });
      
      setRecentOrders(sortedOrders.slice(0, 10));
      
      // Load order statistics (reuse the data we already fetched)
      const pendingOrders = allOrders.filter(order => order.status === OrderStatus.PENDING);
      const inProgressOrders = allOrders.filter(order => order.status === OrderStatus.IN_PROGRESS);
      const readyOrders = allOrders.filter(order => order.status === OrderStatus.READY);
      const deliveredOrders = allOrders.filter(order => order.status === OrderStatus.DELIVERED);
      const cancelledOrders = allOrders.filter(order => order.status === OrderStatus.CANCELLED);
      
      const pendingCount = pendingOrders.length;
      const inProgressCount = inProgressOrders.length;
      const completedCount = deliveredOrders.length;
      const totalOrders = allOrders.length;
      
      // Calculate total revenue from completed orders
      const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.finalAmount, 0);
      
      // Calculate average order value
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Calculate monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthlyRevenue = deliveredOrders.filter(order => 
        new Date(order.$createdAt) > thirtyDaysAgo
      ).reduce((sum, order) => sum + order.finalAmount, 0);
      
      setStats(prev => ({
        ...prev,
        totalRevenue,
        monthlyRevenue,
        totalOrders,
        pendingOrders: pendingCount,
        completedOrders: completedCount,
        averageOrderValue
      }));
      
    } catch (error) {
      console.error('❌ Failed to load orders:', error);
      // Set empty arrays as fallback
      setRecentOrders([]);
      setStats(prev => ({
        ...prev,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageOrderValue: 0
      }));
    }
  };

  const loadServicesData = async () => {
    try {
      const servicesResponse = await databaseService.getActiveServices();
      if (servicesResponse.success && servicesResponse.data) {
        setServices(servicesResponse.data);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };



  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      type: ServiceType.WASH_AND_FOLD,
      description: '',
      basePrice: '',
      pricePerKg: '',
      pricePerItem: '',
      estimatedDuration: '',
      category: '',
      displayOrder: '',
      availableAreas: [],
      tags: [],
      specialInstructions: '',
      isActive: true
    });
    setEditingService(null);
    setShowCreateService(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const serviceData = {
        name: serviceFormData.name,
        type: serviceFormData.type,
        description: serviceFormData.description,
        basePrice: convertNairaToKobo(parseFloat(serviceFormData.basePrice)),
        pricePerKg: serviceFormData.pricePerKg ? convertNairaToKobo(parseFloat(serviceFormData.pricePerKg)) : undefined,
        pricePerItem: serviceFormData.pricePerItem ? convertNairaToKobo(parseFloat(serviceFormData.pricePerItem)) : undefined,
        estimatedDuration: parseInt(serviceFormData.estimatedDuration),
        category: serviceFormData.category,
        displayOrder: parseInt(serviceFormData.displayOrder) || 0,
        availableAreas: serviceFormData.availableAreas,
        tags: serviceFormData.tags,
        specialInstructions: serviceFormData.specialInstructions,
        isActive: serviceFormData.isActive,
        minOrderValue: 0,
        maxOrderValue: 10000000 // ₦100,000 default max
      };

      if (editingService) {
        const response = await databaseService.updateService(editingService.$id, serviceData);
        if (response.success) {
          await loadServicesData();
          resetServiceForm();
          toast.success('Service updated successfully!');
        } else {
          toast.error(`Failed to update service: ${response.error}`);
        }
      } else {
        const response = await databaseService.createService(serviceData);
        if (response.success) {
          await loadServicesData();
          resetServiceForm();
          toast.success('Service created successfully!');
        } else {
          toast.error(`Failed to create service: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('Service operation failed:', error);
      toast.error('Failed to save service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditService = (service: Service) => {
    setServiceFormData({
      name: service.name,
      type: service.type,
      description: service.description,
      basePrice: (service.basePrice / 100).toString(),
      pricePerKg: service.pricePerKg ? (service.pricePerKg / 100).toString() : '',
      pricePerItem: service.pricePerItem ? (service.pricePerItem / 100).toString() : '',
      estimatedDuration: service.estimatedDuration.toString(),
      category: service.category,
      displayOrder: service.displayOrder.toString(),
      availableAreas: service.availableAreas,
      tags: service.tags,
      specialInstructions: service.specialInstructions || '',
      isActive: service.isActive
    });
    setEditingService(service);
    setShowCreateService(true);
  };

  const handleToggleServiceStatus = async (service: Service) => {
    try {
      const response = await databaseService.updateService(service.$id, {
        isActive: !service.isActive
      });
      if (response.success) {
        await loadServicesData();
      } else {
        toast.error(`Failed to update service status: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to toggle service status:', error);
      toast.error('Failed to update service status');
    }
  };

  // Staff registration functions
  const resetStaffForm = () => {
    setStaffFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: UserRole.STAFF,
      employeeId: '',
      hireDate: new Date().toISOString().split('T')[0],
      permissions: [],
      assignedAreas: [],
      workingHours: {
        start: '08:00',
        end: '17:00'
      },
      workingDays: []
    });
    setShowCreateStaff(false);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const staffData = {
        email: staffFormData.email,
        password: staffFormData.password,
        firstName: staffFormData.firstName,
        lastName: staffFormData.lastName,
        phone: staffFormData.phone,
        role: staffFormData.role,
        permissions: staffFormData.permissions,
        assignedAreas: staffFormData.assignedAreas,
        workingHours: staffFormData.workingHours,
        workingDays: staffFormData.workingDays,
        employeeId: staffFormData.employeeId,
        hireDate: staffFormData.hireDate
      };

      const response = await authService.registerAdmin(staffData);
      
      if (response.success) {
        toast.success('Staff member created successfully! They can now login at /admin/login');
        resetStaffForm();
        loadStaffData(); // Reload staff data
      } else {
        toast.error(response.error || 'Failed to create staff member');
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      toast.error('Failed to create staff member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/owner/login');
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;

    setIsDeleting(true);
    try {
      const response = await databaseService.deleteAdminUser(staffToDelete.$id);
      
      if (response.success) {
        toast.success('Staff member deleted successfully');
        setShowDeleteConfirmation(false);
        setStaffToDelete(null);
        loadStaffData(); // Reload staff data
      } else {
        toast.error(response.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to delete staff member');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteStaff = (staff: StaffWithStats) => {
    setStaffToDelete(staff);
    setShowDeleteConfirmation(true);
  };

  const cancelDeleteStaff = () => {
    setShowDeleteConfirmation(false);
    setStaffToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/20 rounded-full animate-float"></div>
          <div className="absolute top-40 right-20 w-20 h-20 bg-indigo-200/20 rounded-full animate-float animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-purple-200/20 rounded-full animate-float animation-delay-4000"></div>
        </div>
        
        <div className="flex flex-col items-center space-y-6 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl text-white">👑</span>
            </div>
            <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Loading Dashboard
            </p>
            <p className="text-gray-600 font-medium">Preparing your business overview...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <>
      {/* Enhanced Stats Grid */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12`}>
        <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 md:p-6 border border-white/50 ${ac.fadeIn}`} style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {formatNairaFromKobo(stats.totalRevenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNairaFromKobo(stats.monthlyRevenue)} this month
            </p>
          </div>
        </div>

        <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 md:p-6 border border-white/50 ${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
            <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {stats.totalOrders}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.completedOrders / stats.totalOrders) * 100 || 0).toFixed(1)}% completion rate
            </p>
          </div>
        </div>

        <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 md:p-6 border border-white/50 ${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Staff Members</p>
            <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              {stats.activeStaff}/{stats.totalStaff}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Active team members
            </p>
          </div>
        </div>

        <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 md:p-6 border border-white/50 ${ac.fadeIn}`} style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Active Customers</p>
            <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {stats.activeCustomers}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              In the last 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Recent Orders */}
      <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-white/50 ${ac.fadeIn}`} style={{ animationDelay: '0.5s' }}>
        <div className="px-6 py-5 border-b border-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Recent Orders</h2>
                <p className="text-sm text-gray-600">Latest customer orders</p>
              </div>
            </div>
            <Link href="/admin/orders" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl">
              View all
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/50">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-gray-200/50">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  </tr>
                ))
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">No recent orders</p>
                      <p className="text-gray-400 text-sm">Orders will appear here once customers start booking</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, index) => (
                  <tr
                    key={order.$id}
                    className={`hover:bg-blue-50/50 transition-colors duration-200 ${ac.fadeIn}`}
                    style={{ animationDelay: `${0.6 + (index * 0.1)}s` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-blue-600">#{order.orderNumber?.slice(-3)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        order.status === OrderStatus.DELIVERED
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : order.status === OrderStatus.PENDING
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {formatNairaFromKobo(order.finalAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderCustomers = () => (
    <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-white/50 ${ac.fadeIn}`}>
      <div className="px-6 py-5 border-b border-gray-100/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Customer Management</h3>
              <p className="text-sm text-gray-600">Complete list of all customers and their activity</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
              Active: {customers.filter(c => c.status === 'active').length}
            </span>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
              Inactive: {customers.filter(c => c.status === 'inactive').length}
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white/50 divide-y divide-gray-200/50">
            {customers.map((customer, index) => (
              <tr key={customer.$id} className={`hover:bg-blue-50/50 transition-colors duration-200 ${ac.fadeIn}`} style={{ animationDelay: `${index * 0.1}s` }}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-blue-600">
                        {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                      </span>
                    </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Joined: {new Date(customer.$createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{customer.email}</div>
                  <div className="text-sm text-gray-500">
                    {customer.phone?.number || 'No phone'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {customer.totalOrders}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  ₦{customer.totalSpent.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    customer.status === 'active' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerDetails(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors"
                  >
                    View
                  </button>
                  
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">No customers found</p>
                    <p className="text-gray-400 text-sm">Customer data will appear here as they register</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      {/* Staff Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Staff Management</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Complete list of all staff members and their performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                Active: {staff.filter(s => s.status === 'active').length}
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                Inactive: {staff.filter(s => s.status === 'inactive').length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateStaff(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              + Add Staff
            </button>
          </div>
        </div>
      </div>

      {/* Create Staff Modal */}
      {showCreateStaff && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Staff Member</h3>
            </div>
            
            <form onSubmit={handleCreateStaff} className="px-6 py-4 space-y-4">
              {/* Personal Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={staffFormData.firstName}
                    onChange={(e) => setStaffFormData({...staffFormData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={staffFormData.lastName}
                    onChange={(e) => setStaffFormData({...staffFormData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={staffFormData.phone}
                    onChange={(e) => setStaffFormData({...staffFormData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+234XXXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={staffFormData.password}
                    onChange={(e) => setStaffFormData({...staffFormData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={staffFormData.role}
                    onChange={(e) => setStaffFormData({...staffFormData, role: e.target.value as UserRole})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value={UserRole.STAFF}>Staff</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    value={staffFormData.employeeId}
                    onChange={(e) => setStaffFormData({...staffFormData, employeeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="EMP001"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    value={staffFormData.hireDate}
                    onChange={(e) => setStaffFormData({...staffFormData, hireDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={staffFormData.workingHours.start}
                    onChange={(e) => setStaffFormData({
                      ...staffFormData, 
                      workingHours: { ...staffFormData.workingHours, start: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={staffFormData.workingHours.end}
                    onChange={(e) => setStaffFormData({
                      ...staffFormData, 
                      workingHours: { ...staffFormData.workingHours, end: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permissions *
                </label>
                <div className="grid grid-cols-2 gap-2 border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <label key={permission} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={staffFormData.permissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStaffFormData({
                              ...staffFormData,
                              permissions: [...staffFormData.permissions, permission]
                            });
                          } else {
                            setStaffFormData({
                              ...staffFormData,
                              permissions: staffFormData.permissions.filter(p => p !== permission)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{permission.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assigned Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Areas *
                </label>
                <div className="grid grid-cols-3 gap-2 border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                  {lagosAreas.map((area) => (
                    <label key={area} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={staffFormData.assignedAreas.includes(area)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStaffFormData({
                              ...staffFormData,
                              assignedAreas: [...staffFormData.assignedAreas, area]
                            });
                          } else {
                            setStaffFormData({
                              ...staffFormData,
                              assignedAreas: staffFormData.assignedAreas.filter(a => a !== area)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Working Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Days *
                </label>
                <div className="grid grid-cols-4 gap-2 border border-gray-300 rounded-md p-3">
                  {workingDaysOptions.map((day) => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={staffFormData.workingDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStaffFormData({
                              ...staffFormData,
                              workingDays: [...staffFormData.workingDays, day]
                            });
                          } else {
                            setStaffFormData({
                              ...staffFormData,
                              workingDays: staffFormData.workingDays.filter(d => d !== day)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetStaffForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400"
                >
                  {isLoading ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">All Staff Members</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {staff.length} staff member(s) registered
          </p>
        </div>
        
        {isLoading ? (
          <div className="px-6 py-4 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading staff...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No staff members found. Add your first staff member to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role & Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders Handled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((member) => (
                  <tr key={member.$id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Hired: {new Date(member.hireDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{member.role}</div>
                      <div className="text-sm text-gray-500">ID: {member.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                      <div className="text-sm text-gray-500">
                        {member.phone?.number || 'No phone'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.ordersHandled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">{member.performance.toFixed(1)}/5.0</span>
                        <div className="ml-2 flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-xs ${i < Math.floor(member.performance) ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'active' ? 'bg-green-100 text-green-800' : 
                        member.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowStaffDetails(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => confirmDeleteStaff(member)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderServices = () => (
    <div className="space-y-6">
      <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-white/50 ${ac.fadeIn}`}>
        <div className="px-6 py-5 border-b border-gray-100/50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
          <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Services Management</h3>
                <p className="text-sm text-gray-600">Manage your laundry services and pricing</p>
              </div>
          </div>
          <button
            onClick={() => setShowCreateService(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Service
          </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/50">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/50 divide-y divide-gray-200/50">
              {services.map((service, index) => (
                <tr key={service.$id} className={`hover:bg-blue-50/50 transition-colors duration-200 ${ac.fadeIn}`} style={{ animationDelay: `${index * 0.1}s` }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mr-3">
                        <span className="text-xl">
                          {service.type === 'wash_and_fold' ? '🧺' : 
                           service.type === 'dry_cleaning' ? '👔' : 
                           service.type === 'ironing' ? '👕' : '🧽'}
                        </span>
                      </div>
                      <div>
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                      {service.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatNairaFromKobo(service.basePrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      service.isActive 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditService(service)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleServiceStatus(service)}
                      className={`transition-colors ${
                        service.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium">No services found</p>
                      <p className="text-gray-400 text-sm">Create your first service to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <Link href="/owner/dashboard" className={`text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${ac.fadeIn}`}>
                Gab'z Owner
              </Link>
              <span className={`text-xs md:text-sm text-gray-500 hidden sm:block ${ac.fadeIn}`}>
                Business Dashboard
              </span>
      </div>

            <div className={`hidden lg:flex items-center space-x-6 ${ac.slideIn}`}>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`font-medium transition-colors duration-200 ${activeTab === 'overview' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('customers')}
                className={`font-medium transition-colors duration-200 ${activeTab === 'customers' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Customers
              </button>
              <button 
                onClick={() => setActiveTab('staff')}
                className={`font-medium transition-colors duration-200 ${activeTab === 'staff' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Staff
              </button>
              <button 
                onClick={() => setActiveTab('services')}
                className={`font-medium transition-colors duration-200 ${activeTab === 'services' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Services
              </button>
            </div>

            <div className="flex items-center">
              <div className={`relative ${ac.scaleIn}`}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('owner-menu');
                    menu?.classList.toggle('hidden');
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-medium shadow-lg">
                    {user?.name?.charAt(0).toUpperCase() || 'O'}
                  </div>
                  <span className="hidden sm:block font-medium">{user?.name || 'Owner'}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div id="owner-menu" className={`hidden absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200/60 py-2 z-50 ${ac.fadeIn}`}>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Mobile Sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
        <div className={`fixed inset-y-0 left-0 w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col py-6 px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Owner Menu</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all duration-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Overview</span>
              </button>
              <button 
                onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Customers</span>
              </button>
              <button 
                onClick={() => { setActiveTab('staff'); setIsSidebarOpen(false); }}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Staff</span>
              </button>
              <button 
                onClick={() => { setActiveTab('services'); setIsSidebarOpen(false); }}
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Services</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Enhanced Header */}
        <div className={`mb-8 ${ac.fadeIn}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Owner Dashboard 👑
                    </h1>
              <p className="text-gray-600 text-lg">
                Welcome back, {user?.name}! Here's your business overview
              </p>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="flex items-center space-x-3">
                  <div className="hidden md:flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">System Online</span>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'staff' && renderStaff()}
        {activeTab === 'services' && renderServices()}

        {/* Service Creation Modal */}
        {showCreateService && (
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${ac.scaleIn}`}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {editingService ? '✏️ Edit Service' : '➕ Create New Service'}
                  </h2>
                  <button
                    onClick={resetServiceForm}
                    className="text-blue-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <form onSubmit={handleCreateService} className="space-y-6">
                  {/* Basic Info Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        ℹ️
                      </span>
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                        <input
                          type="text"
                          value={serviceFormData.name}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="e.g., Premium Wash & Fold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Type *</label>
                        <div className="relative">
                          <select
                            value={serviceFormData.type}
                            onChange={(e) => setServiceFormData(prev => ({ ...prev, type: e.target.value as ServiceType }))}
                            className="w-full appearance-none px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                            required
                          >
                            {Object.values(ServiceType).map((type) => (
                              <option key={type} value={type}>
                                {getServiceIcon(type)} {type.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                      <textarea
                        value={serviceFormData.description}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        rows={3}
                        placeholder="Describe what this service includes..."
                        required
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                      <input
                        type="text"
                        value={serviceFormData.category}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., Standard, Premium, Express"
                        required
                      />
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                        💰
                      </span>
                      Pricing Structure
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Base Price (₦) *</label>
                        <input
                          type="number"
                          value={serviceFormData.basePrice}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          placeholder="1000"
                          min="0"
                          step="50"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price per KG (₦)</label>
                        <input
                          type="number"
                          value={serviceFormData.pricePerKg}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, pricePerKg: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          placeholder="500"
                          min="0"
                          step="50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price per Item (₦)</label>
                        <input
                          type="number"
                          value={serviceFormData.pricePerItem}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, pricePerItem: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          placeholder="200"
                          min="0"
                          step="50"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (hours) *</label>
                      <input
                        type="number"
                        value={serviceFormData.estimatedDuration}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                        className="w-full md:w-1/3 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                        placeholder="24"
                        min="1"
                        max="168"
                        required
                      />
                    </div>
                  </div>

                  {/* Service Areas Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        🗺️
                      </span>
                      Service Areas
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {lagosAreas.map((area) => (
                        <label key={area} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors duration-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={serviceFormData.availableAreas.includes(area)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setServiceFormData(prev => ({
                                  ...prev,
                                  availableAreas: [...prev.availableAreas, area]
                                }));
                              } else {
                                setServiceFormData(prev => ({
                                  ...prev,
                                  availableAreas: prev.availableAreas.filter(a => a !== area)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700 font-medium">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Additional Options Section */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                        ⚙️
                      </span>
                      Additional Options
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                      <textarea
                        value={serviceFormData.specialInstructions}
                        onChange={(e) => setServiceFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none"
                        rows={2}
                        placeholder="Any special care instructions for this service..."
                      />
                    </div>

                    <div className="mt-4">
                      <label className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={serviceFormData.isActive}
                          onChange={(e) => setServiceFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700">
                          Service is active and available for booking
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={resetServiceForm}
                      className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        editingService ? 'Update Service' : 'Create Service'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Customer Details Modal */}
        {showCustomerDetails && selectedCustomer && (
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${ac.scaleIn}`}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    Customer Details
                  </h2>
                  <button
                    onClick={() => setShowCustomerDetails(false)}
                    className="text-blue-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        👤
                      </span>
                      Customer Information
                    </h3>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-2xl font-semibold text-blue-700">
                        {selectedCustomer.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</h4>
                        <p className="text-gray-600">{selectedCustomer.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                        📞
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Phone</h4>
                        <p className="text-gray-600">{selectedCustomer.phone?.number || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl font-semibold text-purple-700">
                        📅
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Join Date</h4>
                        <p className="text-gray-600">{new Date(selectedCustomer.$createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl font-semibold text-amber-700">
                        💳
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Payment Method</h4>
                        <p className="text-gray-600">{selectedCustomer.preferredPaymentMethod || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Stats */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                        📊
                      </span>
                      Order Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          📦
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Total Orders</h4>
                          <p className="text-gray-600">{selectedCustomer.totalOrders}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          💸
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Total Spent</h4>
                          <p className="text-gray-600">₦{selectedCustomer.totalSpent.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          📅
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Last Order Date</h4>
                          <p className="text-gray-600">{selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString() : 'No orders yet'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          📝
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Status</h4>
                          <p className="text-gray-600">{selectedCustomer.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

               
              </div>
            </div>
          </div>
        )}

        {/* Staff Details Modal */}
        {showStaffDetails && selectedStaff && (
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${ac.scaleIn}`}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    Staff Details
                  </h2>
                  <button
                    onClick={() => setShowStaffDetails(false)}
                    className="text-blue-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Staff Info */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        👤
                      </span>
                      Staff Information
                    </h3>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-2xl font-semibold text-blue-700">
                        {selectedStaff.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{selectedStaff.firstName} {selectedStaff.lastName}</h4>
                        <p className="text-gray-600">{selectedStaff.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                        📞
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Phone</h4>
                        <p className="text-gray-600">{selectedStaff.phone?.number || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl font-semibold text-purple-700">
                        📅
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Hire Date</h4>
                        <p className="text-gray-600">{new Date(selectedStaff.hireDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl font-semibold text-amber-700">
                        💳
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Employee ID</h4>
                        <p className="text-gray-600">{selectedStaff.employeeId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 rounded-xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                        📊
                      </span>
                      Performance Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          📦
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Orders Handled</h4>
                          <p className="text-gray-600">{selectedStaff.ordersHandled}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          🌟
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Performance Rating</h4>
                          <p className="text-gray-600">{selectedStaff.averageRating || 'N/A'}/5</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          👥
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Role</h4>
                          <p className="text-gray-600">{selectedStaff.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl font-semibold text-emerald-700">
                          📝
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Status</h4>
                          <p className="text-gray-600">{selectedStaff.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50/50 rounded-xl p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      🔑
                    </span>
                    Permissions
                  </h3>
                  <ul className="space-y-2">
                    {(selectedStaff.permissions && Array.isArray(selectedStaff.permissions) && selectedStaff.permissions.length > 0) ? (
                      selectedStaff.permissions.map((permission) => (
                        <li key={permission} className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span className="text-gray-700">{permission}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500 italic">No permissions assigned</li>
                    )}
                  </ul>
                </div>

                {/* Contact Button */}
                <div className="mt-6">
                  <a
                    href={`tel:${selectedStaff.phone?.number || ''}`}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Contact Staff
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && staffToDelete && (
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full ${ac.scaleIn}`}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Confirm Deletion
                  </h2>
                  <button
                    onClick={cancelDeleteStaff}
                    className="text-red-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Staff Member</h3>
                    <p className="text-gray-600">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete <strong>{staffToDelete.firstName} {staffToDelete.lastName}</strong>? 
                    This will permanently remove their account and all associated data.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelDeleteStaff}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteStaff}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Staff'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
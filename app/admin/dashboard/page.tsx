'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderStatus, Service } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { withAuth } from '@/lib/context/AuthContext';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';

function AdminDashboardPage() {
  const { user, isAdmin, userProfile, logout } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    todayRevenue: 0,
    totalCustomers: 0
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load recent orders (all statuses)
      const recentOrdersResponse = await databaseService.getAllOrders(20);
      if (recentOrdersResponse.success && recentOrdersResponse.data) {
        setOrders(recentOrdersResponse.data);
      }

      // Load today's orders
      const today = new Date().toISOString().split('T')[0];
      const todayOrdersResponse = await databaseService.getOrdersByDate(today);
      if (todayOrdersResponse.success && todayOrdersResponse.data) {
        setTodayOrders(todayOrdersResponse.data);
        
        // Calculate today's revenue
        const revenue = todayOrdersResponse.data.reduce((sum, order) => sum + order.finalAmount, 0);
        setStats(prev => ({ ...prev, todayRevenue: revenue }));
      }

      // Load order statistics
      const pendingResponse = await databaseService.getOrdersByStatus(OrderStatus.PENDING);
      const inProgressResponse = await databaseService.getOrdersByStatus(OrderStatus.IN_PROGRESS);
      const readyResponse = await databaseService.getOrdersByStatus(OrderStatus.READY);
      
      setStats(prev => ({
        ...prev,
        pendingOrders: pendingResponse.data?.length || 0,
        inProgressOrders: inProgressResponse.data?.length || 0,
        totalOrders: (pendingResponse.data?.length || 0) + (inProgressResponse.data?.length || 0) + (readyResponse.data?.length || 0)
      }));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;

    try {
      const response = await databaseService.updateOrderStatus(
        orderId,
        newStatus,
        user.$id,
        `Status updated to ${newStatus} by ${user.name}`
      );

      if (response.success) {
        // Refresh data
        loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case OrderStatus.PICKED_UP:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case OrderStatus.READY:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case OrderStatus.DELIVERED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case OrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return '⏳';
      case OrderStatus.PICKED_UP:
        return '🚚';
      case OrderStatus.IN_PROGRESS:
        return '🧽';
      case OrderStatus.READY:
        return '✅';
      case OrderStatus.DELIVERED:
        return '📦';
      case OrderStatus.CANCELLED:
        return '❌';
      default:
        return '📋';
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  if (!user) {
    return null;
  }

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
              
              <Link href="/admin/dashboard" className={`text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${ac.fadeIn}`}>
                Gab'z Admin
              </Link>
              <span className={`text-xs md:text-sm text-gray-500 hidden sm:block ${ac.fadeIn}`}>
                Staff Dashboard
              </span>
            </div>
            
            <div className={`hidden lg:flex items-center space-x-6 ${ac.slideIn}`}>
              <Link href="/admin/orders" className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200">Orders</Link>
              {/* <Link href="/admin/customers" className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200">Customers</Link> */}
              <Link href="/admin/services/manage" className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200">Services</Link>
            </div>

            <div className="flex items-center">
              <div className={`relative ${ac.scaleIn}`}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('admin-menu');
                    menu?.classList.toggle('hidden');
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-medium shadow-lg">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block font-medium">{user?.name}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <div id="admin-menu" className={`hidden absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200/60 py-2 z-50 ${ac.fadeIn}`}>
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
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Admin Menu</h2>
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
              <Link href="/admin/orders" className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Orders</span>
              </Link>
              <Link href="/admin/customers" className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Customers</span>
              </Link>
              <Link href="/admin/services/manage" className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Services</span>
              </Link>
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
                Admin Dashboard 👨‍💼
              </h1>
              <p className="text-gray-600 text-lg">
                Welcome back, {user?.name}! Here's your business overview
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/admin/orders"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Manage Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            {
              title: 'Total Orders',
              value: stats.totalOrders,
              icon: '📋',
              gradient: 'from-blue-500 to-blue-600',
              bgGradient: 'from-blue-50 to-blue-100',
              delay: '0.1s'
            },
            {
              title: 'Pending Orders',
              value: stats.pendingOrders,
              icon: '⏳',
              gradient: 'from-amber-500 to-amber-600',
              bgGradient: 'from-amber-50 to-amber-100',
              delay: '0.2s'
            },
            {
              title: 'In Progress',
              value: stats.inProgressOrders,
              icon: '🔄',
              gradient: 'from-purple-500 to-purple-600',
              bgGradient: 'from-purple-50 to-purple-100',
              delay: '0.3s'
            },
            {
              title: "Today's Revenue",
              value: formatNairaFromKobo(stats.todayRevenue),
              icon: '💰',
              gradient: 'from-emerald-500 to-emerald-600',
              bgGradient: 'from-emerald-50 to-emerald-100',
              delay: '0.4s'
            }
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 md:p-6 ${ac.fadeIn}`}
              style={{ animationDelay: stat.delay }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.bgGradient} flex items-center justify-center text-2xl hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.gradient}`}></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Quick Actions */}
        <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 md:p-8 mb-8 ${ac.fadeIn}`} style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-600 mt-1">Manage your laundry business efficiently</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Link
              href="/admin/orders"
              className="group p-4 md:p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">View Orders</h3>
                  <p className="text-sm text-gray-600">Manage customer orders and track progress</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/services/manage"
              className="group p-4 md:p-6 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Manage Services</h3>
                  <p className="text-sm text-gray-600">Update pricing & availability</p>
                </div>
              </div>
            </Link>
            <Link
              href="/admin/customers"
              className="group p-4 md:p-6 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">Customer List</h3>
                  <p className="text-sm text-gray-600">View customer information and history</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Enhanced Recent Orders */}
        <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${ac.fadeIn}`} style={{ animationDelay: '0.6s' }}>
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                <p className="text-sm text-gray-600 mt-1">Latest customer orders across all statuses</p>
              </div>
              <Link href="/admin/orders" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                View all
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`animate-pulse ${ac.fadeIn}`} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📋</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No recent orders</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  All orders are up to date! New orders will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order, index) => (
                  <div
                    key={order.$id}
                    className={`group p-3 md:p-4 border border-gray-100 hover:border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-0.5 ${ac.fadeIn}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Mobile Layout */}
                    <div className="block md:hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                            {getStatusIcon(order.status)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>₦{formatNairaFromKobo(order.finalAmount)}</span>
                          <Link 
                            href={`/admin/orders/${order.$id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            Order #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })} • ₦{formatNairaFromKobo(order.finalAmount)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize border ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <Link 
                          href={`/admin/orders/${order.$id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(AdminDashboardPage, true);
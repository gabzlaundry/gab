'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { Navbar } from '@/components/ui/navbar';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';
import { toast } from 'sonner';

function DashboardContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0,
    completedOrders: 0
  });
  const [showWelcome, setShowWelcome] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if new user
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true);
    }

    loadDashboardData();
  }, [isAuthenticated, router, searchParams]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load recent orders
      const ordersResponse = await databaseService.getCustomerOrders(user.$id, 10);
      let userOrders: Order[] = [];
      
      if (ordersResponse.success && ordersResponse.data) {
        userOrders = ordersResponse.data.documents;
        setOrders(userOrders);
      }

      // Calculate stats from orders data
      const totalOrders = userOrders.length;
      const totalSpent = userOrders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
      const completedOrders = userOrders.filter(order => order.status === OrderStatus.DELIVERED).length;
      
      // Calculate loyalty points (1 point per ₦100 spent)
      const loyaltyPoints = Math.floor(totalSpent / 10000); // 1 point per ₦100 (10000 kobo)

      console.log('Dashboard Stats Calculated:', {
        totalOrders,
        totalSpent,
        loyaltyPoints,
        completedOrders,
        ordersCount: userOrders.length
      });

      setStats({
        totalOrders,
        totalSpent,
        loyaltyPoints,
        completedOrders
      });

      // Fallback: Try to load user stats from database if available
      try {
      const statsResponse = await databaseService.getUserStats(user.$id);
      if (statsResponse.success && statsResponse.data) {
          const dbStats = statsResponse.data;
          // Use database stats if they exist and are more comprehensive
          setStats(prev => ({
            totalOrders: dbStats.totalOrders || prev.totalOrders,
            totalSpent: dbStats.totalSpent || prev.totalSpent,
            loyaltyPoints: dbStats.loyaltyPoints || prev.loyaltyPoints,
            completedOrders: dbStats.completedOrders || prev.completedOrders
          }));
        }
      } catch (statsError) {
        console.log('User stats not available, using calculated stats');
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
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
    router.push('/');
  };

  const handlePayNow = async (orderId: string) => {
    try {
      const response = await fetch('/api/payment/ready-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, customerId: user?.$id }),
      });

      const result = await response.json();

      if (result.success && result.data?.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = result.data.authorizationUrl;
      } else {
        toast.error(result.error || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      toast.error('Failed to initialize payment');
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      {/* Welcome Banner */}
      {showWelcome && (
        <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 text-white ${ac.slideIn}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
              <div>
                  <h2 className="text-lg font-semibold">Welcome to Gab'z Laundromat, {user.name || 'User'}!</h2>
                <p className="text-blue-100">Your account is ready. Book your first laundry service today!</p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="text-blue-200 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className={`mb-8 ${ac.fadeIn}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Welcome back, {user.name?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-gray-600 text-lg">
                Manage your laundry services and track your orders
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                href="/book"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Service
              </Link>
              </div>
            </div>
          </div>

        {/* Stats Cards */}
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
              title: 'Total Spent',
              value: formatNairaFromKobo(stats.totalSpent),
              icon: '💰',
              gradient: 'from-emerald-500 to-emerald-600',
              bgGradient: 'from-emerald-50 to-emerald-100',
              delay: '0.2s'
            },
            {
              title: 'Loyalty Points',
              value: stats.loyaltyPoints,
              icon: '⭐',
              gradient: 'from-purple-500 to-purple-600',
              bgGradient: 'from-purple-50 to-purple-100',
              delay: '0.3s'
            },
            {
              title: 'Completed',
              value: stats.completedOrders,
              icon: '✅',
              gradient: 'from-amber-500 to-amber-600',
              bgGradient: 'from-amber-50 to-amber-100',
              delay: '0.4s'
            }
          ].map((stat, index) => (
            <div
              key={stat.title}
              className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 md:p-6 ${ac.fadeIn}`}
              style={{ animationDelay: stat.delay }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.bgGradient} flex items-center justify-center text-2xl`}>
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

        {/* Quick Actions */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 ${ac.fadeIn}`} style={{ animationDelay: '0.5s' }}>
          <Link
            href="/book"
            className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Book New Service</h3>
                <p className="text-blue-100 text-sm">Schedule pickup & delivery</p>
              </div>
            </div>
          </Link>

          <Link
            href="/services"
            className="group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Browse Services</h3>
                <p className="text-gray-600 text-sm">View all available services</p>
              </div>
            </div>
          </Link>

          <div className="group bg-white border border-gray-200 p-6 rounded-2xl transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-green-200 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Contact Support</h3>
                <p className="text-gray-600 text-sm">+234 913 743 5555</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${ac.fadeIn}`} style={{ animationDelay: '0.6s' }}>
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                <p className="text-sm text-gray-600 mt-1">Track your latest laundry services</p>
              </div>
              {orders.length > 0 && (
                <Link
                  href="/orders"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View all
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
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
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📋</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Start by booking your first laundry service with us and experience premium care!
                </p>
                <Link
                  href="/book"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Book Your First Service
                </Link>
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
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNairaFromKobo(order.finalAmount)}
                        </p>
                        <div className="flex items-center space-x-2">
                          {order.status === OrderStatus.READY && order.paymentMethod === PaymentMethod.PAY_ON_PICKUP && (
                            <button
                              onClick={() => handlePayNow(order.$id)}
                              className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-medium rounded-lg transition-all duration-200"
                            >
                              Pay Now
                            </button>
                          )}
                          <Link
                            href={`/orders/${order.$id}`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                          >
                            View Details
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
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
                          })}
                        </p>
                          <p className="text-sm font-medium text-gray-900">
                          {formatNairaFromKobo(order.finalAmount)}
                        </p>
                      </div>
                    </div>
                    
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                        {order.status === OrderStatus.READY && order.paymentMethod === PaymentMethod.PAY_ON_PICKUP && (
                          <button
                            onClick={() => handlePayNow(order.$id)}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:-translate-y-0.5"
                          >
                            Pay Now
                          </button>
                        )}
                      <Link
                        href={`/orders/${order.$id}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors group-hover:translate-x-1 duration-300"
                      >
                          View
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                      </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
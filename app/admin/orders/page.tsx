'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderStatus } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { withAuth } from '@/lib/context/AuthContext';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';

function AdminOrdersPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus, searchTerm, dateFilter]);

  const loadOrders = async () => {
    try {
      // Load all orders (you might want to paginate this in a real app)
      const responses = await Promise.all([
        databaseService.getOrdersByStatus(OrderStatus.PENDING),
        databaseService.getOrdersByStatus(OrderStatus.PICKED_UP),
        databaseService.getOrdersByStatus(OrderStatus.IN_PROGRESS),
        databaseService.getOrdersByStatus(OrderStatus.READY),
        databaseService.getOrdersByStatus(OrderStatus.DELIVERED),
        databaseService.getOrdersByStatus(OrderStatus.CANCELLED)
      ]);

      const allOrders: Order[] = [];
      responses.forEach(response => {
        if (response.success && response.data) {
          allOrders.push(...response.data);
        }
      });

      // Sort by creation date (newest first)
      allOrders.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Filter by search term (order number or customer details)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        const orderNumberMatch = order.orderNumber.toLowerCase().includes(searchLower);
        
        // Handle address search based on delivery type
        let addressMatch = false;
        if (order.deliveryType === 'delivery') {
          const pickupAddressStr = order.pickupAddress ? 
            `${order.pickupAddress.street} ${order.pickupAddress.area} ${order.pickupAddress.lga}`.toLowerCase() : '';
          const deliveryAddressStr = order.deliveryAddress ? 
            `${order.deliveryAddress.street} ${order.deliveryAddress.area} ${order.deliveryAddress.lga}`.toLowerCase() : '';
          addressMatch = pickupAddressStr.includes(searchLower) || deliveryAddressStr.includes(searchLower);
        }
        
        return orderNumberMatch || addressMatch;
      });
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.$createdAt).toISOString().split('T')[0];
        return orderDate === dateFilter;
      });
    }

    setFilteredOrders(filtered);
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
        // Update local state
        setOrders(prev => 
          prev.map(order => 
            order.$id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
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

  const getNextStatusAction = (currentStatus: OrderStatus) => {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        return { status: OrderStatus.PICKED_UP, label: 'Mark Picked Up', color: 'blue' };
      case OrderStatus.PICKED_UP:
        return { status: OrderStatus.IN_PROGRESS, label: 'Start Processing', color: 'purple' };
      case OrderStatus.IN_PROGRESS:
        return { status: OrderStatus.READY, label: 'Mark Ready', color: 'green' };
      case OrderStatus.READY:
        return { status: OrderStatus.DELIVERED, label: 'Mark Delivered', color: 'gray' };
      default:
        return null;
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between ${ac.fadeIn}`}>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Order Management 📋
              </h1>
              <p className="text-gray-600 text-lg">
                Track and manage all customer orders across Lagos State
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {filteredOrders.length} of {orders.length} orders
              </div>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Enhanced Filters */}
        <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6 mb-6 md:mb-8 border border-white/20 ${ac.fadeIn}`} style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as OrderStatus | 'all')}
                  className="w-full appearance-none px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="all">All Orders</option>
                  <option value={OrderStatus.PENDING}>⏳ Pending</option>
                  <option value={OrderStatus.PICKED_UP}>🚚 Picked Up</option>
                  <option value={OrderStatus.IN_PROGRESS}>🧽 In Progress</option>
                  <option value={OrderStatus.READY}>✅ Ready</option>
                  <option value={OrderStatus.DELIVERED}>📦 Delivered</option>
                  <option value={OrderStatus.CANCELLED}>❌ Cancelled</option>
              </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order number, address..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedStatus('all');
                  setSearchTerm('');
                  setDateFilter('');
                }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Orders Section */}
        <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 ${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h2 className="text-xl font-bold flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders ({filteredOrders.length})
            </h2>
            <p className="text-blue-100 text-sm mt-1">Manage customer orders and update status</p>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`animate-pulse bg-gray-50 rounded-xl p-4 ${ac.fadeIn}`} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-24 h-8 bg-gray-200 rounded-lg"></div>
                      <div className="w-28 h-8 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-6 md:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">
                {orders.length === 0 
                  ? "No orders have been placed yet. Orders will appear here once customers start booking services."
                  : "Try adjusting your filters to see more orders."
                }
              </p>
              {orders.length === 0 && (
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  Back to Dashboard
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOrders.map((order, index) => {
                const nextAction = getNextStatusAction(order.status);
                
                return (
                  <div
                    key={order.$id}
                    className={`p-4 md:p-6 hover:bg-blue-50/50 transition-all duration-300 group ${ac.slideIn}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Mobile Layout */}
                    <div className="block md:hidden space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              #{order.orderNumber}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Type:</span> {order.deliveryType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}</p>
                        <p><span className="font-medium">Payment:</span> {order.paymentMethod}</p>
                        <p><span className="font-medium">Amount:</span> {formatNairaFromKobo(order.finalAmount)}</p>
                        {order.deliveryType === 'delivery' && order.pickupAddress && (
                          <p><span className="font-medium">Area:</span> {order.pickupAddress.area}, {order.pickupAddress.lga}</p>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        {nextAction && (
                          <button
                            onClick={() => updateOrderStatus(order.$id, nextAction.status)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${
                              nextAction.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' :
                              nextAction.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white' :
                              nextAction.color === 'green' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white' :
                              'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                            }`}
                          >
                            {nextAction.label}
                          </button>
                        )}
                        
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/orders/${order.$id}`}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 text-center"
                          >
                            View Details
                          </Link>
                          
                          {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                            <button
                              onClick={() => updateOrderStatus(order.$id, OrderStatus.CANCELLED)}
                              className="flex-1 px-4 py-2 border border-red-300 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 transition-all duration-300"
                            >
                              Cancel
                            </button>
                          )}
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
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              Order #{order.orderNumber}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <p>
                              <span className="font-medium">Created:</span> {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p>
                              <span className="font-medium">Type:</span> {order.deliveryType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
                              {order.deliveryType === 'delivery' && order.pickupAddress && 
                                ` | Area: ${order.pickupAddress.area}, ${order.pickupAddress.lga}`
                              }
                            </p>
                            <p>
                              <span className="font-medium">Payment:</span> {order.paymentMethod} | 
                              <span className="font-medium"> Amount:</span> {formatNairaFromKobo(order.finalAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {nextAction && (
                          <button
                            onClick={() => updateOrderStatus(order.$id, nextAction.status)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${
                              nextAction.color === 'blue' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white' :
                              nextAction.color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white' :
                              nextAction.color === 'green' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white' :
                              'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                            }`}
                          >
                            {nextAction.label}
                          </button>
                        )}
                        
                        <Link
                          href={`/admin/orders/${order.$id}`}
                          className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                        >
                          View Details
                        </Link>
                        
                        {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                          <button
                            onClick={() => updateOrderStatus(order.$id, OrderStatus.CANCELLED)}
                            className="px-4 py-2 border border-red-300 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enhanced Pagination */}
        {filteredOrders.length > 20 && (
          <div className={`mt-6 md:mt-8 ${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6 text-center border border-white/20">
              <div className="text-sm text-gray-600 mb-4">
                Showing first 20 of {filteredOrders.length} orders
              </div>
              <div className="text-xs text-gray-500">
                📝 Pagination feature coming soon for better performance
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(AdminOrdersPage);
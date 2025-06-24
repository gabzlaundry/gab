'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { User, Order } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';

interface CustomerWithStats extends User {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  name: string; // Computed from firstName + lastName
  phoneNumber: string; // Computed from phone.number
  role: string; // Added for filtering
}

export default function AdminCustomersPage() {
  const { user, isAuthenticated, userRole } = useAuth();
  const router = useRouter();
  
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'recent'>('name');

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') {
      router.push('/admin/login');
      return;
    }

    loadCustomers();
  }, [isAuthenticated, userRole, router]);

  useEffect(() => {
    filterAndSortCustomers();
  }, [customers, searchTerm, sortBy]);

  const loadCustomers = async () => {
    try {
      // Get all customers (this would need pagination in production)
      const customersResponse = await databaseService.getAllUsers();
      
      if (customersResponse.success && customersResponse.data) {
        // Get all users and filter/enhance them
        const allUsers = customersResponse.data;
        
        // Get order statistics for each customer
        const customersWithStats = await Promise.all(
          allUsers.map(async (customer) => {
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
            
            return {
              ...customer,
              totalOrders,
              totalSpent,
              lastOrderDate,
              name: `${customer.firstName} ${customer.lastName}`,
              phoneNumber: customer.phone.number,
              role: 'customer' // Assume all users from User table are customers
            };
          })
        );
        
        setCustomers(customersWithStats);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCustomers = () => {
    let filtered = customers;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.phoneNumber.includes(searchTerm)
      );
    }

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'orders':
          return b.totalOrders - a.totalOrders;
        case 'spent':
          return b.totalSpent - a.totalSpent;
        case 'recent':
          if (!a.lastOrderDate) return 1;
          if (!b.lastOrderDate) return -1;
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        default:
          return 0;
      }
    });

    setFilteredCustomers(filtered);
  };

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 50000) { // ₦500+
      return { tier: 'VIP', color: 'bg-purple-100 text-purple-800', icon: '👑' };
    } else if (totalSpent >= 20000) { // ₦200+
      return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '⭐' };
    } else if (totalSpent >= 10000) { // ₦100+
      return { tier: 'Silver', color: 'bg-gray-100 text-gray-800', icon: '🥈' };
    } else {
      return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' };
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format Nigerian phone number for display
    return phone.replace(/(\+234)(\d{3})(\d{4})(\d{4})/, '$1 $2 $3 $4');
  };

  if (!isAuthenticated || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-2xl font-bold text-blue-600">
                Gab'z Admin
              </Link>
              <span className="text-sm text-gray-500 hidden sm:block">
                Customer Management
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/orders"
                className="text-gray-600 hover:text-gray-900"
              >
                Orders
              </Link>
              <Link
                href="/admin/services"
                className="text-gray-600 hover:text-gray-900"
              >
                Services
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">
            View and manage customer accounts across Lagos State
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.totalOrders > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">VIP Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.totalSpent >= 50000).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNairaFromKobo(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customers
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, or phone number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name (A-Z)</option>
                <option value="orders">Most Orders</option>
                <option value="spent">Highest Spending</option>
                <option value="recent">Recent Activity</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="w-20 h-6 bg-gray-200 rounded"></div>
                      <div className="w-24 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-6 text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600">
                {customers.length === 0 
                  ? "No customers have registered yet."
                  : "Try adjusting your search to see more customers."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => {
                const tier = getCustomerTier(customer.totalSpent);
                
                return (
                  <div
                    key={customer.$id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {customer.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tier.color}`}>
                              {tier.icon} {tier.tier}
                            </span>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-600">
                            <p>📧 {customer.email}</p>
                            <p>📱 {formatPhoneNumber(customer.phoneNumber)}</p>
                            <p>
                              📍 {customer.addresses[0]?.area || 'No address'} | 
                              📅 Joined {new Date(customer.$createdAt).toLocaleDateString('en-NG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-2">
                          <div className="font-semibold text-gray-900">
                            {customer.totalOrders} orders
                          </div>
                          <div className="font-semibold text-green-600">
                            {formatNairaFromKobo(customer.totalSpent)} spent
                          </div>
                          {customer.lastOrderDate && (
                            <div className="text-xs">
                              Last order: {new Date(customer.lastOrderDate).toLocaleDateString('en-NG', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/customers/${customer.$id}`}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            View Profile
                          </Link>
                          <Link
                            href={`/admin/customers/${customer.$id}/orders`}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            View Orders
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        {filteredCustomers.length > 20 && (
          <div className="mt-8 flex justify-center">
            <div className="text-sm text-gray-600">
              Showing first 20 customers. Pagination coming soon.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
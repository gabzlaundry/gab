'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod } from '@/lib/types';
import { formatNairaFromKobo } from '@/lib/validations';
import { PaystackButton } from '@/components/PaystackPayment';
import { Navbar } from '@/components/ui/navbar';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';
import { toast } from 'sonner';

interface OrderDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function OrderDetailsContent({ params }: OrderDetailsPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if redirected from successful payment
    const paymentSuccess = searchParams.get('payment') === 'success' || searchParams.get('success') === 'true';
    if (paymentSuccess) {
      setShowPaymentSuccess(true);
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }

    loadOrderDetails(paymentSuccess);
  }, [isAuthenticated, router, resolvedParams.id, searchParams]);

  const loadOrderDetails = async (checkPaymentStatus = false) => {
    try {
      const response = await databaseService.getOrderById(resolvedParams.id);
      
      if (response.success && response.data) {
        const { order: orderData, items } = response.data;
        
        // Check if user owns this order (for security)
        if (orderData.customerId !== user?.$id) {
          setError('Order not found or access denied');
          return;
        }
        
        // If payment was successful but order is still pending, try to update it
        if (checkPaymentStatus && orderData.paymentStatus === 'pending') {
          console.log('🔍 Payment successful but order still pending, attempting to verify and update...');
          
          // Check if there's a payment reference in the URL or try to get the latest payment
          const reference = searchParams.get('reference') || searchParams.get('trxref');
          
          if (reference) {
            try {
              console.log('🔄 Verifying payment with reference:', reference);
              
              // Import payment service for verification
              const { paymentService } = await import('@/lib/payment');
              const verificationResponse = await paymentService.verifyPayment(reference);
              
              if (verificationResponse.success && verificationResponse.data?.status === 'success') {
                console.log('✅ Payment verified successfully, updating order status...');
                
                // Update payment status
                const paymentUpdateResponse = await databaseService.updateOrderPaymentStatus(
                  orderData.$id,
                  'paid' as any,
                  reference,
                  verificationResponse.data.amount || orderData.finalAmount
                );
                
                if (paymentUpdateResponse.success) {
                  console.log('✅ Payment status updated');
                  
                  // Update order status to confirmed
                  const statusUpdateResponse = await databaseService.updateOrderStatus(
                    orderData.$id,
                    'confirmed' as any,
                    'system',
                    'Payment verified and confirmed via order page'
                  );
                  
                  if (statusUpdateResponse.success) {
                    console.log('✅ Order status updated to confirmed');
                    // Reload the order data to show updated status
                    setTimeout(() => {
                      loadOrderDetails(false);
                    }, 1000);
                    return;
                  }
                }
              }
            } catch (verificationError) {
              console.error('❌ Payment verification failed:', verificationError);
            }
                      } else {
              console.log('⚠️ No payment reference found in URL for verification');
            }
        }
        
        setOrder(orderData);
        setOrderItems(items);
      } else {
        setError(response.error || 'Failed to load order details');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

    const manuallyVerifyPayment = async () => {
      if (!order) return;
      
      setIsVerifyingPayment(true);
      
      try {
        console.log('🔄 Manually verifying payment for order:', order.$id);
        
        // Check if there's a payment reference in the URL
        const reference = searchParams.get('reference') || searchParams.get('trxref');
        
        if (reference) {
          const { paymentService } = await import('@/lib/payment');
          const verificationResponse = await paymentService.verifyPayment(reference);
          
          if (verificationResponse.success && verificationResponse.data?.status === 'success') {
            console.log('✅ Payment verified successfully');
            
            // Update payment status
            const paymentUpdateResponse = await databaseService.updateOrderPaymentStatus(
              order.$id,
              'paid' as any,
              reference,
              verificationResponse.data.amount || order.finalAmount
            );
            
            if (paymentUpdateResponse.success) {
              // Update order status to confirmed
              await databaseService.updateOrderStatus(
                order.$id,
                'confirmed' as any,
                'system',
                'Payment manually verified and confirmed'
              );
              
              // Reload order data
              loadOrderDetails(false);
              toast.success('Payment verified successfully! Your order status has been updated.');
            } else {
              toast.error('Payment was verified but failed to update order status. Please contact support.');
            }
          } else {
            toast.error('Payment verification failed. Please contact support with your order number.');
          }
        } else {
          // If no reference, just try to refresh the order data in case webhook updated it
          await loadOrderDetails(false);
          if (order.paymentStatus === 'pending') {
            toast.error('No payment reference found. If you completed payment, please contact support with your order number and payment receipt.');
          }
        }
      } catch (error) {
        console.error('❌ Manual payment verification failed:', error);
        toast.error('Failed to verify payment. Please contact support.');
      } finally {
        setIsVerifyingPayment(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case OrderStatus.CONFIRMED:
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
      case OrderStatus.CONFIRMED:
        return '✅';
      case OrderStatus.IN_PROGRESS:
        return '🧽';
      case OrderStatus.READY:
        return '📦';
      case OrderStatus.DELIVERED:
        return '🎉';
      case OrderStatus.CANCELLED:
        return '❌';
      default:
        return '📋';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case PaymentStatus.PENDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case PaymentStatus.FAILED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">😔</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-8 text-lg">{error}</p>
          <Link
            href="/dashboard"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
          >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            Back to Dashboard
          </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Success Message */}
        {showPaymentSuccess && (
          <div className={`bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4 md:p-6 mb-6 shadow-lg ${ac.slideIn}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
                <div>
                  <p className="text-sm text-emerald-700">
                    {order?.paymentStatus === 'pending' 
                      ? 'Updating order status...' 
                      : 'Your order has been confirmed and we\'ll start processing it soon.'
                    }
                  </p>
                </div>
              </div>
              {order?.paymentStatus === 'pending' && (
                <button
                  onClick={() => loadOrderDetails(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105"
                >
                  Refresh
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 md:p-8 mb-6 ${ac.fadeIn}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  #
                </div>
            <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Order #{order.orderNumber}
                  </h1>
                  <p className="text-gray-600 text-sm md:text-base">
                    {new Date(order.$createdAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center text-xl">
                  {getStatusIcon(order.status)}
                </div>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold capitalize border ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${getPaymentStatusColor(order.paymentStatus)}`}>
                💳 {order.paymentStatus}
                </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Order Items */}
            <div className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${ac.fadeIn}`} style={{ animationDelay: '0.1s' }}>
              <div className="p-6 md:p-8 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Order Items</h2>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
              <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div 
                      key={item.$id} 
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${ac.fadeIn}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex-1 mb-3 sm:mb-0">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {item.itemDescription || 'Laundry Item'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Qty: {item.quantity}
                          </span>
                          {item.weight && (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {item.weight}kg
                            </span>
                          )}
                        </div>
                      {item.specialInstructions && (
                          <p className="text-sm text-blue-600 mt-2 italic">
                            💡 {item.specialInstructions}
                        </p>
                      )}
                    </div>
                      
                      <div className="text-left sm:text-right">
                        <p className="text-xl font-bold text-gray-900 mb-1">
                        {formatNairaFromKobo(item.totalPrice)}
                      </p>
                        <p className="text-sm text-gray-500">
                        {formatNairaFromKobo(item.unitPrice)} each
                      </p>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
              <div className="p-6 md:p-8 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Service Addresses</h2>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-blue-900 text-lg">Pickup Address</h3>
                    </div>
                    <p className="text-blue-800 leading-relaxed">
                    {order.pickupAddress ? (
                      typeof order.pickupAddress === 'string' ? order.pickupAddress : 
                      `${order.pickupAddress.street}, ${order.pickupAddress.area}, ${order.pickupAddress.lga}`
                    ) : 'Not specified'}
                  </p>
                </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-green-900 text-lg">Delivery Address</h3>
                    </div>
                    <p className="text-green-800 leading-relaxed">
                    {order.deliveryAddress ? (
                      typeof order.deliveryAddress === 'string' ? order.deliveryAddress : 
                      `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.lga}`
                    ) : 'Not specified'}
                  </p>
                  </div>
                </div>
                
                {/* Contact Number */}
                <div className="mt-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-purple-900 text-lg">Contact Number</h3>
                  </div>
                  <p className="text-purple-800 leading-relaxed">
                    {order.contactNumber || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
              <div className="p-6 md:p-8 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Order Timeline</h2>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                <div className="space-y-6">
                {(() => {
                  try {
                    const orderHistory = JSON.parse(order.orderHistory || '[]');
                    return orderHistory.map((entry: any, index: number) => (
                        <div 
                          key={index} 
                          className={`flex items-start space-x-4 ${ac.fadeIn}`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-xl border-4 border-white shadow-lg">
                      {getStatusIcon(entry.status)}
                    </div>
                          <div className="flex-1 min-w-0">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4">
                              <h3 className="font-semibold text-gray-900 capitalize text-lg mb-1">
                        {entry.status.replace('_', ' ')}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                        {new Date(entry.timestamp).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {entry.notes && (
                                <p className="text-sm text-gray-700 italic">
                                  💬 {entry.notes}
                                </p>
                      )}
                    </div>
                  </div>
                      </div>
                    ));
                  } catch (e) {
                    return (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📋</span>
                          </div>
                          <p className="text-gray-500">No order history available</p>
                      </div>
                    );
                  }
                })()}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${ac.fadeIn}`} style={{ animationDelay: '0.4s' }}>
              <div className="p-6 md:p-8 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatNairaFromKobo(order.totalAmount)}</span>
                  </div>
                  
                {order.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Discount
                      </span>
                      <span className="font-semibold">-{formatNairaFromKobo(order.discountAmount)}</span>
                  </div>
                )}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">{formatNairaFromKobo(order.finalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Payment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Method</span>
                      <span className="font-medium capitalize bg-gray-100 px-3 py-1 rounded-full">
                      {order.paymentMethod?.replace('_', ' ') || 'Not specified'}
                    </span>
                  </div>
                    <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Status</span>
                      <span className={`font-semibold capitalize px-3 py-1 rounded-full text-xs border ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                    </div>
                  </div>
                </div>
                  </div>
                </div>

            {/* Action Buttons */}
            <div className={`space-y-4 ${ac.fadeIn}`} style={{ animationDelay: '0.5s' }}>
            {/* Receipt Button */}
                <Link
                  href={`/receipt/${order.$id}`}
                className="block w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl text-center"
                >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View & Print Receipt
                  </div>
                </Link>

              {/* Back to Dashboard */}
              <Link
                href="/dashboard"
                className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 border border-gray-200 hover:border-gray-300 text-center shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
              </div>
              </Link>
            </div>

            {/* Contact Support */}
            <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 md:p-8 border border-blue-100 ${ac.fadeIn}`} style={{ animationDelay: '0.6s' }}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">Need Help?</h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Our customer support team is here to help with any questions about your order.
                </p>
              </div>
              
              <div className="space-y-3">
                <a 
                  href="tel:+2349137435555" 
                  className="flex items-center justify-center bg-white hover:bg-blue-50 text-blue-600 font-medium py-3 px-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call Support
                </a>
                
                <a 
                  href="https://wa.me/2349137435555" 
                  className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  WhatsApp Chat
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    }>
      <OrderDetailsContent params={params} />
    </Suspense>
  );
} 
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { databaseService } from '@/lib/database';
import { Order, OrderItem, Service, PaymentStatus } from '@/lib/types';
import OrderReceipt from '@/components/OrderReceipt';
import Link from 'next/link';
import { Navbar } from '@/components/ui/navbar';
import { responsiveClasses as rc, animationClasses as ac } from '@/lib/animations';
import { toast } from 'sonner';

function ReceiptPageContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatusChecks, setPaymentStatusChecks] = useState(0);

  const loadOrderData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    
    try {
      // Load order and items
      const orderResponse = await databaseService.getOrderById(id as string);
      if (!orderResponse.success || !orderResponse.data) {
        setError('Order not found');
        return;
      }

      const { order, items } = orderResponse.data;
      
      // Verify this order belongs to the current user
      if (order.customerId !== user?.$id) {
        setError('Access denied');
        return;
      }

      setOrder(order);
      setOrderItems(items);

      // Load services if not already loaded
      if (services.length === 0) {
        const servicesResponse = await databaseService.getActiveServices();
        if (servicesResponse.success && servicesResponse.data) {
          setServices(servicesResponse.data);
        }
      }

    } catch (error) {
      console.error('Failed to load order data:', error);
      setError('Failed to load order data');
    } finally {
      setIsLoading(false);
      if (showRefreshing) setIsRefreshing(false);
    }
  }, [id, user?.$id, services.length]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadOrderData();
  }, [isAuthenticated, router, loadOrderData]);

  // Auto-refresh payment status for the first few minutes after payment
  useEffect(() => {
    if (!order || order.paymentStatus === PaymentStatus.PAID || paymentStatusChecks >= 10) {
      return;
    }

    // Check if this is coming from payment callback
    const fromPayment = searchParams.get('payment') === 'success';
    
    if (fromPayment || order.paymentStatus === PaymentStatus.PENDING) {
      const interval = setInterval(() => {
        console.log('Checking payment status...');
        loadOrderData(false);
        setPaymentStatusChecks(prev => prev + 1);
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [order, paymentStatusChecks, searchParams, loadOrderData]);

  const handleManualRefresh = () => {
    loadOrderData(true);
  };

  const handlePrint = () => {
    // Create a new window with only the receipt content
    const receiptContent = document.getElementById('receipt-content');
    if (!receiptContent || !order) {
      console.error('Receipt content or order not found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the receipt');
      return;
    }

    // Create a style element with print-specific styles
    const printStyles = `
      @page {
        size: auto;
        margin: 10mm;
      }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        background-color: white;
      }
      .receipt-container {
        max-width: 210mm;
        padding: 10mm;
        background-color: white;
      }
      /* Fix for Tailwind classes that might not be included */
      .text-blue-600 { color: #2563eb; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-500 { color: #6b7280; }
      .text-green-600 { color: #16a34a; }
      .text-yellow-600 { color: #ca8a04; }
      .text-red-600 { color: #dc2626; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      .text-2xl { font-size: 1.5rem; }
      .text-lg { font-size: 1.125rem; }
      .text-sm { font-size: 0.875rem; }
      .text-xs { font-size: 0.75rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
      .space-y-3 > * + * { margin-top: 0.75rem; }
      .space-y-2 > * + * { margin-top: 0.5rem; }
      .space-y-1 > * + * { margin-top: 0.25rem; }
      .pt-4 { padding-top: 1rem; }
      .border-t { border-top-width: 1px; }
      .border-gray-200 { border-color: #e5e7eb; }
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .text-center { text-align: center; }
      .rounded-lg { border-radius: 0.5rem; }
      .italic { font-style: italic; }
      .capitalize { text-transform: capitalize; }
      .flex-1 { flex: 1 1 0%; }
      .text-right { text-align: right; }
      .p-6 { padding: 1.5rem; }
      hr { border: 0; border-top: 1px solid #e5e7eb; }
    `;

    // Set the content of the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt #${order.orderNumber}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="receipt-container">
            ${receiptContent.outerHTML}
          </div>
          <script>
            // Auto print when loaded
            window.onload = function() {
              window.print();
              // Close the window after printing (or if print is canceled)
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
          <p className="text-gray-600 font-medium">Loading receipt...</p>
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
              <span className="text-4xl">📄</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Receipt Not Found</h1>
            <p className="text-gray-600 mb-8 text-lg">{error || 'The requested receipt could not be found.'}</p>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Page Header */}
        <div className={`text-center mb-6 md:mb-8 ${ac.fadeIn}`}>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Receipt</h1>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            Order #{order.orderNumber} • {new Date(order.$createdAt).toLocaleDateString('en-NG')}
          </p>
        </div>

        {/* Status Messages */}
        {order.paymentStatus === PaymentStatus.PAID ? (
          <div className={`bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg ${ac.slideIn}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                <svg className="h-6 w-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-emerald-900 mb-2">
                  🎉 Payment Confirmed & Order Received!
                </h3>
                <p className="text-emerald-700 leading-relaxed">
                  Your order #{order.orderNumber} has been paid and confirmed. 
                  {order.deliveryType === 'pickup' 
                    ? ' You can bring this receipt when visiting our store.'
                    : ' We will contact you to confirm the pickup time.'
                  }
                </p>
              </div>
            </div>
          </div>
        ) : order.paymentStatus === PaymentStatus.PENDING ? (
          <div className={`bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg ${ac.slideIn}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-6 w-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">
                    ⏳ Payment Pending
                  </h3>
                  <p className="text-amber-700 leading-relaxed">
                    Your order #{order.orderNumber} is waiting for payment confirmation.
                    {isRefreshing && " Checking payment status..."}
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0 ml-4"
              >
                {isRefreshing ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Checking...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </div>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className={`bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 shadow-lg ${ac.slideIn}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  ❌ Payment Issue
                </h3>
                <p className="text-red-700 leading-relaxed">
                  There's an issue with your payment for order #{order.orderNumber}. 
                  Please contact support or try paying again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Container */}
        <div className={`bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden mb-6 md:mb-8 ${ac.fadeIn}`} style={{ animationDelay: '0.2s' }}>
          <OrderReceipt
            order={order}
            orderItems={orderItems}
            services={services}
            onPrint={handlePrint}
          />
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-col sm:flex-row gap-4 print:hidden ${ac.fadeIn}`} style={{ animationDelay: '0.3s' }}>
          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt
            </div>
          </button>

          {/* View Order Details */}
          <Link
            href={`/orders/${order.$id}`}
            className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Order Details
            </div>
          </Link>

          {/* Back to Dashboard */}
          <Link
            href="/dashboard"
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
              </svg>
              Back to Dashboard
            </div>
          </Link>
        </div>

        {/* Contact Support Section */}
        <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 md:p-8 border border-blue-100 mt-8 print:hidden ${ac.fadeIn}`} style={{ animationDelay: '0.4s' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">Need Help with Your Order?</h3>
            <p className="text-blue-700 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              If you have any questions about your receipt or order, our customer support team is here to help.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading receipt...</p>
        </div>
      </div>
    }>
      <ReceiptPageContent />
    </Suspense>
  );
} 
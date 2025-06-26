'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { paymentService } from '@/lib/payment';
import { databaseService } from '@/lib/database';
import { useAuth } from '@/lib/context/AuthContext';

interface VerificationResult {
  success: boolean;
  message: string;
  orderId?: string;
  orderNumber?: string;
}

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      let orderId = searchParams.get('orderId');

      if (!reference) {
        setVerificationResult({
          success: false,
          message: 'Payment reference not found'
        });
        setIsVerifying(false);
        return;
      }

      // If orderId is not provided, try to extract it from the payment reference
      // Reference format: GAB_${orderId}_${timestamp}
      if (!orderId && reference.startsWith('GAB_')) {
        const parts = reference.split('_');
        if (parts.length >= 3) {
          // Get the order ID part (everything except GAB and timestamp)
          orderId = parts.slice(1, -1).join('_');
          console.log('📋 Extracted order ID from reference:', orderId);
        }
      }

      try {
        // Verify payment with Paystack
        const verificationResponse = await paymentService.verifyPayment(reference);

        if (verificationResponse.success && verificationResponse.data) {
          const paymentData = verificationResponse.data;

          if (paymentData.status === 'success') {
            // Payment successful
            let orderNumber = '';
            
            if (orderId) {
              // Get order details to show order number
              const orderResponse = await databaseService.getOrderById(orderId);
              if (orderResponse.success && orderResponse.data) {
                orderNumber = orderResponse.data.order.orderNumber;
                
                // Manual fallback: Update payment status if webhook hasn't done it yet
                const currentOrder = orderResponse.data.order;
                if (currentOrder.paymentStatus === 'pending') {
                  console.log('📋 Payment verified but order still pending, updating manually...');
                  
                  // Update payment status
                  const paymentUpdateResponse = await databaseService.updateOrderPaymentStatus(
                    orderId,
                    'paid' as any,
                    reference,
                    paymentData.amount
                  );
                  
                  if (paymentUpdateResponse.success) {
                    console.log('✅ Payment status updated manually');
                    
                    // Update order status to confirmed
                    await databaseService.updateOrderStatus(
                      orderId,
                      'confirmed' as any,
                      'system',
                      'Payment confirmed via callback verification'
                    );
                    console.log('✅ Order status updated to confirmed');
                  }
                }
              }
            }

            setVerificationResult({
              success: true,
              message: 'Payment successful! Your order has been confirmed.',
              orderId: orderId || undefined,
              orderNumber
            });

            // Redirect to receipt page after 3 seconds
            if (orderId) {
              setTimeout(() => {
                router.push(`/receipt/${orderId}?payment=success&reference=${reference}`);
              }, 10000);
            }
          } else {
            // Payment failed
            setVerificationResult({
              success: false,
              message: 'Payment was not successful. Please try again.'
            });
          }
        } else {
          setVerificationResult({
            success: false,
            message: 'Unable to verify payment. Please contact support.'
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationResult({
          success: false,
          message: 'An error occurred while verifying payment.'
        });
      }

      setIsVerifying(false);
    };

    verifyPayment();
  }, [searchParams, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Payment
            </h2>
            <p className="text-gray-600">
              Please wait while we confirm your payment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {verificationResult?.success ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                Payment Successful! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                {verificationResult.message}
              </p>
              {verificationResult.orderNumber && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    <strong>Order Number:</strong> #{verificationResult.orderNumber}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    You'll receive WhatsApp notifications about your order status.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {/* {verificationResult.orderId && ( */}
                  <Link
                    href={`/receipt/${verificationResult.orderId}?payment=success`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    View Receipt
                  </Link>
                {/* )} */}
                <Link
                  href="/dashboard"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {verificationResult?.message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/book"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Try Again
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Need help? Contact us at{' '}
                    <a href="tel:+2349137435555" className="text-blue-600 hover:text-blue-700">
                      +234 913 743 5555
                    </a>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
} 
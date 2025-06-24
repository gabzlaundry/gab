'use client';

import { useEffect, useState } from 'react';
import { paymentService } from '@/lib/payment';
import { PaymentData } from '@/lib/payment';

interface PaystackPaymentProps {
  paymentData: PaymentData;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function PaystackPayment({
  paymentData,
  onSuccess,
  onClose,
  disabled = false,
  className = '',
  children
}: PaystackPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!scriptLoaded || !window.PaystackPop) {
      alert('Payment system is loading. Please try again in a moment.');
      return;
    }

    setIsLoading(true);

    try {
      // Initialize payment with Paystack
      const initResponse = await paymentService.initializePayment(paymentData);

      if (!initResponse.success || !initResponse.data) {
        throw new Error(initResponse.error || 'Failed to initialize payment');
      }

      // Configure Paystack Inline
      const paystackConfig = paymentService.getInlinePaymentConfig({
        ...paymentData,
        onSuccess: (reference: string) => {
          setIsLoading(false);
          onSuccess(reference);
        },
        onClose: () => {
          setIsLoading(false);
          onClose();
        }
      });

      // Open Paystack payment modal
      const handler = window.PaystackPop.setup(paystackConfig);
      handler.openIframe();

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setIsLoading(false);
      alert(error.message || 'Failed to start payment process');
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || isLoading || !scriptLoaded}
      className={`relative ${className} ${
        disabled || isLoading || !scriptLoaded
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:opacity-90'
      }`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </div>
      ) : !scriptLoaded ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Payment...
        </div>
      ) : (
        children || 'Pay Now'
      )}
    </button>
  );
}

// Helper component for common payment button styling
export function PaystackButton({
  paymentData,
  onSuccess,
  onClose,
  disabled = false,
  children
}: PaystackPaymentProps) {
  return (
    <PaystackPayment
      paymentData={paymentData}
      onSuccess={onSuccess}
      onClose={onClose}
      disabled={disabled}
      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
    >
      {children || (
        <>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Pay with Paystack
        </>
      )}
    </PaystackPayment>
  );
} 
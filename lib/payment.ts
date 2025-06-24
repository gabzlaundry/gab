import { ApiResponse } from './types';

// Paystack types
export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

export interface PaymentData {
  email: string;
  amount: number; // Amount in kobo
  currency: string;
  reference?: string;
  callback_url?: string;
  metadata?: {
    orderId: string;
    customerId: string;
    customerName: string;
    phoneNumber: string;
  };
}

export interface PaystackResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaymentVerificationResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'abandoned';
    customer: {
      email: string;
      phone?: string;
    };
    metadata?: any;
    paid_at?: string;
  };
}

console.log(process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY, 'paystackConfig');

export class PaymentService {
  private config: PaystackConfig;

  constructor() {
    this.config = {
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      secretKey: process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY || '',
      baseUrl: 'https://api.paystack.co'
    };

    if (!this.config.publicKey) {
      console.warn('Paystack public key not configured');
    }
  }

  // Generate unique payment reference
  generateReference(orderId: string): string {
    const timestamp = Date.now();
    return `GAB_${orderId}_${timestamp}`;
  }

  // Initialize payment (client-side with Paystack Inline)
  async initializePayment(paymentData: PaymentData): Promise<ApiResponse<{
    authorizationUrl: string;
    reference: string;
    accessCode: string;
  }>> {
    try {
      if (!this.config.secretKey) {
        return {
          success: false,
          error: 'Payment service not configured'
        };
      }

      const reference = paymentData.reference || this.generateReference(paymentData.metadata?.orderId || '');
      
      const payload = {
        email: paymentData.email,
        amount: paymentData.amount, // Already in kobo
        currency: paymentData.currency || 'NGN',
        reference,
        callback_url: paymentData.callback_url,
        metadata: paymentData.metadata,
        channels: ['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer'],
        split_code: undefined // Add split code if using Paystack splits
      };

      const response = await fetch(`${this.config.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result: PaystackResponse = await response.json();

      if (result.status && result.data) {
        return {
          success: true,
          data: {
            authorizationUrl: result.data.authorization_url,
            reference: result.data.reference,
            accessCode: result.data.access_code
          }
        };
      } else {
        return {
          success: false,
          error: result.message || 'Payment initialization failed'
        };
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      return {
        success: false,
        error: error.message || 'Payment initialization failed'
      };
    }
  }

  // Verify payment
  async verifyPayment(reference: string): Promise<ApiResponse<PaymentVerificationResponse['data']>> {
    try {
      if (!this.config.secretKey) {
        return {
          success: false,
          error: 'Payment service not configured'
        };
      }

      const response = await fetch(`${this.config.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result: PaymentVerificationResponse = await response.json();

      if (result.status && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.message || 'Payment verification failed'
        };
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message || 'Payment verification failed'
      };
    }
  }

  // Get payment banks (for bank transfer)
  async getPaymentBanks(): Promise<ApiResponse<Array<{
    id: number;
    name: string;
    code: string;
    active: boolean;
  }>>> {
    try {
      if (!this.config.publicKey) {
        return {
          success: false,
          error: 'Payment service not configured'
        };
      }

      const response = await fetch(`${this.config.baseUrl}/bank`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.publicKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to fetch banks'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch banks'
      };
    }
  }

  // Client-side Paystack Inline integration
  getInlinePaymentConfig(paymentData: PaymentData & { onSuccess: (reference: string) => void; onClose: () => void }) {
    return {
      key: this.config.publicKey,
      email: paymentData.email,
      amount: paymentData.amount, // Amount in kobo
      currency: paymentData.currency || 'NGN',
      ref: paymentData.reference || this.generateReference(paymentData.metadata?.orderId || ''),
      metadata: paymentData.metadata,
      callback: paymentData.onSuccess,
      onClose: paymentData.onClose,
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
    };
  }

  // Format amount for display (kobo to Naira)
  formatAmount(amountInKobo: number): string {
    const naira = amountInKobo / 100;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(naira);
  }

  // Convert Naira to kobo for Paystack
  convertToKobo(nairaAmount: number): number {
    return Math.round(nairaAmount * 100);
  }

  // Convert kobo to Naira
  convertToNaira(koboAmount: number): number {
    return koboAmount / 100;
  }
}

// Create and export instance
export const paymentService = new PaymentService();
import { ApiResponse } from './types';

// WhatsApp Business API types
export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  baseUrl: string;
}

export interface WhatsAppMessage {
  to: string; // Recipient phone number in international format
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface NotificationTemplate {
  name: string;
  language: string;
  components: Array<{
    type: string;
    parameters: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

export class WhatsAppNotificationService {
  private config: WhatsAppConfig;

  constructor() {
    this.config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      baseUrl: 'https://graph.facebook.com/v17.0'
    };

    if (!this.config.accessToken) {
      console.warn('WhatsApp access token not configured');
    }
  }

  // Send text message
  async sendTextMessage(to: string, message: string): Promise<ApiResponse<WhatsAppResponse>> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      // Ensure phone number is in correct format (remove + for WhatsApp API)
      const phoneNumber = to.replace('+', '');

      const payload: WhatsAppMessage = {
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(
        `${this.config.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result: WhatsAppResponse = await response.json();

      if (response.ok && result.messages) {
        return {
          success: true,
          data: result
        };
      } else {
        return {
          success: false,
          error: 'Failed to send WhatsApp message'
        };
      }
    } catch (error: any) {
      console.error('WhatsApp message error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      };
    }
  }

  // Send template message
  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    parameters: string[] = []
  ): Promise<ApiResponse<WhatsAppResponse>> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        return {
          success: false,
          error: 'WhatsApp service not configured'
        };
      }

      const phoneNumber = to.replace('+', '');

      const payload: WhatsAppMessage = {
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en'
          },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }] : undefined
        }
      };

      const response = await fetch(
        `${this.config.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result: WhatsAppResponse = await response.json();

      if (response.ok && result.messages) {
        return {
          success: true,
          data: result
        };
      } else {
        return {
          success: false,
          error: 'Failed to send WhatsApp template message'
        };
      }
    } catch (error: any) {
      console.error('WhatsApp template message error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp template message'
      };
    }
  }

  // Send order confirmation
  async sendOrderConfirmation(
    customerPhone: string,
    customerName: string,
    orderNumber: string,
    totalAmount: number,
    pickupDate: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! 🧺

Your order #${orderNumber} has been confirmed at Gab'z Laundromat.

📋 Order Details:
• Total Amount: ₦${(totalAmount / 100).toLocaleString()}
• Pickup Date: ${pickupDate}

We'll send you updates as your order progresses. Thank you for choosing Gab'z Laundromat!

Need help? Reply to this message or call us.`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Send pickup confirmation
  async sendPickupConfirmation(
    customerPhone: string,
    customerName: string,
    orderNumber: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! 🚚

Great news! Your laundry has been picked up.

📋 Order #${orderNumber}
Status: Picked up and heading to our facility

We'll notify you once processing begins. Your clothes are in good hands!

Track your order: https://gabzlaundromat.com/orders/${orderNumber}`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Send processing update
  async sendProcessingUpdate(
    customerPhone: string,
    customerName: string,
    orderNumber: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! 🧽

Your laundry is now being processed.

📋 Order #${orderNumber}
Status: In Progress

Our team is giving your clothes the care they deserve. We'll notify you when they're ready for delivery!`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Send ready for delivery
  async sendReadyForDelivery(
    customerPhone: string,
    customerName: string,
    orderNumber: string,
    deliveryDate: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! ✅

Excellent news! Your laundry is ready for delivery.

📋 Order #${orderNumber}
Status: Ready for Delivery
Scheduled Delivery: ${deliveryDate}

Please ensure someone is available to receive your clean clothes. We'll be there soon!

Questions? Just reply to this message.`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Send delivery confirmation
  async sendDeliveryConfirmation(
    customerPhone: string,
    customerName: string,
    orderNumber: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! 📦

Your order has been successfully delivered!

📋 Order #${orderNumber}
Status: Delivered ✅

Thank you for choosing Gab'z Laundromat. We hope you're satisfied with our service!

⭐ Rate your experience: https://gabzlaundromat.com/review
🔄 Book again: https://gabzlaundromat.com/book

We look forward to serving you again soon!`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Send promotional message
  async sendPromotionalMessage(
    customerPhone: string,
    customerName: string,
    promoCode?: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! 🎉

Special offer just for you at Gab'z Laundromat!

🎁 20% OFF your next order
${promoCode ? `Use code: ${promoCode}` : ''}
Valid until: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}

📱 Book now: https://gabzlaundromat.com/book
📞 Call us: +234 800 GABZ

*Terms and conditions apply. Available across Lagos State.`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Send payment reminder
  async sendPaymentReminder(
    customerPhone: string,
    customerName: string,
    orderNumber: string,
    amount: number,
    paymentUrl?: string
  ): Promise<ApiResponse<WhatsAppResponse>> {
    const message = `Hi ${customerName}! 💳

Payment reminder for your order.

📋 Order #${orderNumber}
Amount Due: ₦${(amount / 100).toLocaleString()}

${paymentUrl ? `Pay now: ${paymentUrl}` : 'Please complete payment to proceed with your order.'}

Payment methods available:
• Online payment (Card/Bank Transfer)
• POS on delivery
• Bank transfer

Need assistance? Reply to this message.`;

    return this.sendTextMessage(customerPhone, message);
  }

  // Format Nigerian phone number for WhatsApp
  formatPhoneForWhatsApp(phone: string): string {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +234, remove the +
    if (cleaned.startsWith('+234')) {
      return cleaned.substring(1);
    }
    
    // If it starts with 234, keep as is
    if (cleaned.startsWith('234')) {
      return cleaned;
    }
    
    // If it starts with 0, replace with 234
    if (cleaned.startsWith('0')) {
      return '234' + cleaned.substring(1);
    }
    
    // Default: assume it's a Nigerian number without country code
    return '234' + cleaned;
  }

  // Validate WhatsApp phone number
  isValidWhatsAppNumber(phone: string): boolean {
    const formatted = this.formatPhoneForWhatsApp(phone);
    return /^234[789]\d{9}$/.test(formatted);
  }
}

// Create and export instance
export const whatsappService = new WhatsAppNotificationService();

// Utility functions for common notifications
export const sendOrderNotification = async (
  customerPhone: string,
  customerName: string,
  orderNumber: string,
  status: string,
  additionalData?: any
): Promise<ApiResponse<WhatsAppResponse>> => {
  switch (status.toLowerCase()) {
    case 'pending':
      return whatsappService.sendOrderConfirmation(
        customerPhone,
        customerName,
        orderNumber,
        additionalData?.totalAmount || 0,
        additionalData?.pickupDate || ''
      );
    case 'picked_up':
      return whatsappService.sendPickupConfirmation(
        customerPhone,
        customerName,
        orderNumber
      );
    case 'in_progress':
      return whatsappService.sendProcessingUpdate(
        customerPhone,
        customerName,
        orderNumber
      );
    case 'ready':
      return whatsappService.sendReadyForDelivery(
        customerPhone,
        customerName,
        orderNumber,
        additionalData?.deliveryDate || ''
      );
    case 'delivered':
      return whatsappService.sendDeliveryConfirmation(
        customerPhone,
        customerName,
        orderNumber
      );
    default:
      return {
        success: false,
        error: 'Unknown order status'
      };
  }
}; 
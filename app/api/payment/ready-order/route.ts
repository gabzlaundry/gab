import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';
import { authService } from '@/lib/auth';
import { paymentService } from '@/lib/payment';
import { OrderStatus, PaymentMethod } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { orderId, customerId } = await request.json();

    console.log('Ready order payment request:', { orderId, customerId });

    if (!orderId || !customerId) {
      return NextResponse.json({
        success: false,
        error: 'Order ID and Customer ID are required'
      }, { status: 400 });
    }

    // Get the order details
    console.log('Fetching order details for:', orderId);
    const orderResponse = await databaseService.getOrderById(orderId);
    
    console.log('Order response:', { success: orderResponse.success, hasData: !!orderResponse.data, error: orderResponse.error });
    
    if (!orderResponse.success || !orderResponse.data) {
      console.log('Order not found or error:', orderResponse.error);
      return NextResponse.json({
        success: false,
        error: orderResponse.error || 'Order not found'
      }, { status: 404 });
    }

    const { order } = orderResponse.data;

    // Verify the order belongs to the customer
    if (order.customerId !== customerId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access to order'
      }, { status: 403 });
    }

    // Check if order is ready and payment method is PAY_ON_PICKUP
    if (order.status !== OrderStatus.READY) {
      return NextResponse.json({
        success: false,
        error: 'Order is not ready for pickup'
      }, { status: 400 });
    }

    if (order.paymentMethod !== PaymentMethod.PAY_ON_PICKUP) {
      return NextResponse.json({
        success: false,
        error: 'Order is not set for pay on pickup'
      }, { status: 400 });
    }

    // Get customer details for payment
    const customerResponse = await authService.getUserProfile(customerId);
    if (!customerResponse.success || !customerResponse.data) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    const customer = customerResponse.data;

          // Initialize payment with Paystack
      const paymentData = {
        email: customer.email,
        amount: order.finalAmount,
        currency: 'NGN',
        metadata: {
          orderId: orderId,
          customerId: customerId,
          customerName: `${customer.firstName} ${customer.lastName}`,
          phoneNumber: typeof customer.phone === 'string' ? customer.phone : customer.phone?.number || '',
          paymentType: 'pay_on_pickup'
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`
      };

    // Initialize payment directly with payment service
    const paymentResult = await paymentService.initializePayment(paymentData);

    if (paymentResult.success && paymentResult.data?.authorizationUrl) {
      return NextResponse.json({
        success: true,
        data: {
          authorizationUrl: paymentResult.data.authorizationUrl,
          reference: paymentResult.data.reference
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: paymentResult.error || 'Failed to initialize payment'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Ready order payment error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
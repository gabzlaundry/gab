import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { databaseService } from '@/lib/database';
import { OrderStatus, PaymentStatus } from '@/lib/types';
import { whatsappService } from '@/lib/notifications';

// Verify Paystack webhook signature
function verifyPaystackSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');
  
  return hash === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    
    console.log('📥 Paystack webhook received');
    console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));
    
    if (!signature) {
      console.error('❌ Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyPaystackSignature(body, signature)) {
      console.error('❌ Invalid signature verification');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    
    console.log('✅ Paystack webhook verified successfully');
    console.log('📋 Event:', event.event);
    console.log('📋 Event Data:', JSON.stringify(event.data, null, 2));

    switch (event.event) {
      case 'charge.success':
        console.log('💳 Processing charge.success event');
        await handlePaymentSuccess(event.data);
        break;
        
      case 'charge.failed':
        console.log('❌ Processing charge.failed event');
        await handlePaymentFailed(event.data);
        break;
        
      case 'transfer.success':
        console.log('💸 Processing transfer.success event');
        await handleTransferSuccess(event.data);
        break;
        
      case 'transfer.failed':
        console.log('❌ Processing transfer.failed event');
        await handleTransferFailed(event.data);
        break;
        
      default:
        console.log('⚠️ Unhandled Paystack event:', event.event);
    }

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ status: 'success' });
    
  } catch (error) {
    console.error('❌ Paystack webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(data: any) {
  try {
    const { reference, amount, customer, metadata } = data;
    
    console.log('💳 Starting payment success handling');
    console.log('📋 Payment Reference:', reference);
    console.log('📋 Amount:', amount);
    console.log('📋 Customer:', customer);
    console.log('📋 Metadata:', metadata);
    
    let orderId = metadata?.orderId;
    
    // If orderId is not in metadata, try to extract it from the payment reference
    // Reference format: GAB_${orderId}_${timestamp}
    if (!orderId && reference && reference.startsWith('GAB_')) {
      const parts = reference.split('_');
      if (parts.length >= 3) {
        // Get the order ID part (everything except GAB and timestamp)
        orderId = parts.slice(1, -1).join('_');
        console.log('📋 Extracted order ID from reference:', orderId);
      }
    }
    
    if (!orderId) {
      console.error('❌ No orderId found in metadata or reference');
      console.error('📋 Full metadata:', JSON.stringify(metadata, null, 2));
      console.error('📋 Reference:', reference);
      return;
    }

    console.log('🔄 Updating order payment status...');
    // Update order payment status
    const updateResponse = await databaseService.updateOrderPaymentStatus(
      orderId,
      PaymentStatus.PAID,
      reference,
      amount
    );

    if (updateResponse.success) {
      console.log('✅ Payment status updated successfully');
      
      console.log('🔄 Updating order status to CONFIRMED...');
      // Update order status to confirmed (payment received)
      const statusResponse = await databaseService.updateOrderStatus(
        orderId,
        OrderStatus.CONFIRMED,
        'system',
        'Payment confirmed - Order ready for processing'
      );

      if (statusResponse.success) {
        console.log('✅ Order status updated to CONFIRMED successfully');
      } else {
        console.error('❌ Failed to update order status:', statusResponse.error);
      }

      // Send WhatsApp notification
      try {
      if (metadata.customerPhone && metadata.customerName) {
          console.log('📱 Sending WhatsApp notification...');
        await whatsappService.sendPickupConfirmation(
          metadata.customerPhone,
          metadata.customerName,
          metadata.orderNumber || metadata.orderId
        );
          console.log('✅ WhatsApp notification sent');
        } else {
          console.log('⚠️ No customer phone/name for WhatsApp notification');
        }
      } catch (notificationError) {
        console.error('❌ WhatsApp notification failed:', notificationError);
        // Don't fail the whole webhook for notification errors
      }

      console.log(`🎉 Payment processing completed successfully for order ${orderId}`);
    } else {
      console.error('❌ Failed to update payment status:', updateResponse.error);
    }
  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    console.error('📋 Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }
}

async function handlePaymentFailed(data: any) {
  try {
    const { reference, metadata } = data;
    
    let orderId = metadata?.orderId;
    
    // If orderId is not in metadata, try to extract it from the payment reference
    if (!orderId && reference && reference.startsWith('GAB_')) {
      const parts = reference.split('_');
      if (parts.length >= 3) {
        orderId = parts.slice(1, -1).join('_');
      }
    }
    
    if (!orderId) {
      console.error('No orderId found in metadata or reference');
      return;
    }

    // Update order payment status
    await databaseService.updateOrderPaymentStatus(
      orderId,
      PaymentStatus.FAILED,
      reference,
      0
    );

    // Send payment failure notification
    if (metadata.customerPhone && metadata.customerName) {
      await whatsappService.sendPaymentReminder(
        metadata.customerPhone,
        metadata.customerName,
        metadata.orderNumber || metadata.orderId,
        metadata.amount || 0
      );
    }

    console.log(`Payment failed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleTransferSuccess(data: any) {
  // Handle successful bank transfer
  console.log('Transfer successful:', data);
}

async function handleTransferFailed(data: any) {
  // Handle failed bank transfer
  console.log('Transfer failed:', data);
} 
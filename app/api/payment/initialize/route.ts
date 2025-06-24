import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment';
import { PaymentData } from '@/lib/payment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentData }: { paymentData: PaymentData } = body;

    // Validate required fields
    if (!paymentData.email || !paymentData.amount || !paymentData.metadata?.orderId) {
      return NextResponse.json(
        { error: 'Missing required payment data' },
        { status: 400 }
      );
    }

    // Initialize payment with Paystack
    const response = await paymentService.initializePayment(paymentData);

    if (response.success && response.data) {
      return NextResponse.json({
        success: true,
        data: {
          authorizationUrl: response.data.authorizationUrl,
          reference: response.data.reference,
          accessCode: response.data.accessCode
        }
      });
    } else {
      return NextResponse.json(
        { error: response.error || 'Payment initialization failed' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
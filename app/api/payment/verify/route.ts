import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/payment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const response = await paymentService.verifyPayment(reference);

    if (response.success && response.data) {
      return NextResponse.json({
        success: true,
        data: response.data
      });
    } else {
      return NextResponse.json(
        { error: response.error || 'Payment verification failed' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
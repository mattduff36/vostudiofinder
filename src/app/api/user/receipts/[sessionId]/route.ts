import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    const payment = await db.payments.findUnique({
      where: { stripe_checkout_session_id: sessionId },
      select: {
        id: true,
        user_id: true,
        stripe_charge_id: true,
        stripe_payment_intent_id: true,
        stripe_checkout_session_id: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user || user.id !== payment.user_id) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'SUCCEEDED') {
      return NextResponse.json({ error: 'Receipt not available for this payment' }, { status: 400 });
    }

    let receiptUrl: string | null = null;
    let invoiceUrl: string | null = null;
    let invoicePdf: string | null = null;

    // Try charge receipt_url first (Stripe's hosted receipt page)
    if (payment.stripe_charge_id) {
      try {
        const charge = await stripe.charges.retrieve(payment.stripe_charge_id);
        if (charge.receipt_url) {
          receiptUrl = charge.receipt_url;
        }
      } catch {
        console.warn(`Could not retrieve charge ${payment.stripe_charge_id}`);
      }
    }

    // Try to find an invoice (created by invoice_creation on checkout or subscription)
    if (payment.stripe_checkout_session_id) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(
          payment.stripe_checkout_session_id,
          { expand: ['invoice'] }
        );

        const invoice = checkoutSession.invoice;
        if (invoice && typeof invoice === 'object') {
          if (invoice.hosted_invoice_url) {
            invoiceUrl = invoice.hosted_invoice_url;
          }
          if (invoice.invoice_pdf) {
            invoicePdf = invoice.invoice_pdf;
          }
        }
      } catch {
        console.warn(`Could not retrieve checkout session invoice for ${payment.stripe_checkout_session_id}`);
      }
    }

    // Fall back to payment_intent -> latest_charge if we still have no receipt
    if (!receiptUrl && payment.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
          { expand: ['latest_charge'] }
        );
        const charge = pi.latest_charge;
        if (charge && typeof charge === 'object' && charge.receipt_url) {
          receiptUrl = charge.receipt_url;
        }
      } catch {
        console.warn(`Could not retrieve payment intent ${payment.stripe_payment_intent_id}`);
      }
    }

    return NextResponse.json({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      date: payment.created_at?.toISOString(),
      receiptUrl,
      invoiceUrl,
      invoicePdf,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}

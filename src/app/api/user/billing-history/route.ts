import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

interface BillingItem {
  id: string;
  type: 'invoice' | 'receipt';
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  date: string;
  description: string;
  receiptUrl: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ items: [] });
    }

    const items: BillingItem[] = [];
    const invoicePaymentIntentIds = new Set<string>();

    // 1. Fetch Stripe invoices (subscription payments)
    try {
      const customers = await stripe.customers.list({
        email: session.user.email!,
        limit: 1,
      });

      if (customers.data.length > 0 && customers.data[0]) {
        const invoices = await stripe.invoices.list({
          customer: customers.data[0].id,
          limit: 50,
        });

        for (const invoice of invoices.data) {
          const piId = (invoice as unknown as { payment_intent?: string | null }).payment_intent;
          if (piId && typeof piId === 'string') {
            invoicePaymentIntentIds.add(piId);
          }

          const statusMap: Record<string, BillingItem['status']> = {
            paid: 'paid',
            open: 'pending',
            void: 'failed',
            uncollectible: 'failed',
          };

          items.push({
            id: invoice.id,
            type: 'invoice',
            number: invoice.number || invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: statusMap[invoice.status || ''] || 'pending',
            date: new Date(invoice.created * 1000).toISOString(),
            description: invoice.lines.data[0]?.description || 'Premium Membership',
            receiptUrl: null,
            invoiceUrl: invoice.hosted_invoice_url || null,
            invoicePdf: invoice.invoice_pdf || null,
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch Stripe invoices:', err);
    }

    // 2. Fetch one-time payment records from DB
    const payments = await db.payments.findMany({
      where: {
        user_id: user.id,
        status: { in: ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        stripe_charge_id: true,
        stripe_payment_intent_id: true,
        stripe_checkout_session_id: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
        metadata: true,
      },
    });

    for (const payment of payments) {
      // Skip if this payment is already represented by a Stripe invoice
      if (payment.stripe_payment_intent_id && invoicePaymentIntentIds.has(payment.stripe_payment_intent_id)) {
        continue;
      }

      let receiptUrl: string | null = null;

      if (payment.stripe_charge_id) {
        try {
          const charge = await stripe.charges.retrieve(payment.stripe_charge_id);
          receiptUrl = charge.receipt_url || null;
        } catch {
          // Non-critical
        }
      }

      // Check if invoice_creation produced an invoice for this checkout session
      let invoiceUrl: string | null = null;
      let invoicePdf: string | null = null;

      if (payment.stripe_checkout_session_id) {
        try {
          const cs = await stripe.checkout.sessions.retrieve(
            payment.stripe_checkout_session_id,
            { expand: ['invoice'] }
          );
          const inv = cs.invoice;
          if (inv && typeof inv === 'object') {
            invoiceUrl = inv.hosted_invoice_url || null;
            invoicePdf = inv.invoice_pdf || null;
          }
        } catch {
          // Non-critical
        }
      }

      const statusMap: Record<string, BillingItem['status']> = {
        SUCCEEDED: 'paid',
        REFUNDED: 'refunded',
        PARTIALLY_REFUNDED: 'refunded',
      };

      const meta = payment.metadata as Record<string, string> | null;
      const purpose = meta?.purpose || '';
      let description = 'Premium Membership';
      if (purpose === 'featured_upgrade') description = 'Featured Studio Upgrade';
      if (purpose === 'membership_renewal') description = 'Premium Membership Renewal';
      if (purpose === 'membership_upgrade') description = 'Premium Membership Upgrade';

      items.push({
        id: payment.id,
        type: 'receipt',
        number: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: statusMap[payment.status] || 'paid',
        date: payment.created_at?.toISOString() || new Date().toISOString(),
        description,
        receiptUrl,
        invoiceUrl,
        invoicePdf,
      });
    }

    // Sort all items by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing history' },
      { status: 500 }
    );
  }
}

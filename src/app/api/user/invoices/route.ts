import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer from Stripe
    const customers = await stripe.customers.list({
      email: session.user.email!,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ invoices: [] });
    }

    const customer = customers.data[0];

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 50,
    });

    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number || invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' ? 'pending' : 'failed',
      date: new Date(invoice.created * 1000).toISOString(),
      downloadUrl: invoice.invoice_pdf,
      description: invoice.lines.data[0]?.description || 'Premium Studio Subscription',
    }));

    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // Get the invoice from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Verify the invoice belongs to the current user
    const customers = await stripe.customers.list({
      email: session.user.email!,
      limit: 1,
    });

    if (customers.data.length === 0 || customers.data[0].id !== invoice.customer) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.invoice_pdf) {
      return NextResponse.json({ error: 'PDF not available' }, { status: 404 });
    }

    // Fetch the PDF from Stripe
    const response = await fetch(invoice.invoice_pdf);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 });
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.number || invoiceId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json(
      { error: 'Failed to download invoice' },
      { status: 500 }
    );
  }
}

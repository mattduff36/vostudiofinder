import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Reorder FAQs (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { faqs } = body; // Array of { id, sort_order }

    if (!Array.isArray(faqs)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Update all FAQs in a transaction
    await db.$transaction(
      faqs.map((faq: { id: string; sort_order: number }) =>
        db.faq.update({
          where: { id: faq.id },
          data: { 
            sort_order: faq.sort_order,
            updated_at: new Date()
          }
        })
      )
    );

    return NextResponse.json({ 
      success: true,
      message: 'FAQs reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering FAQs:', error);
    return NextResponse.json(
      { error: 'Failed to reorder FAQs' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { faqFields } from '@/lib/admin/content-validation';
import { parseContent, contentError } from '@/lib/admin/content-api';

// GET - Fetch all FAQs (public endpoint, no auth required)
export async function GET() {
  try {
    const faqs = await db.faq.findMany({
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
    });

    return NextResponse.json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}

// POST - Create new FAQ (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const input = await parseContent(request, faqFields.omit({ sort_order: true }).strict());
    const faq = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(44657829)`;
      const lastFaq = await tx.faq.findFirst({ orderBy: { sort_order: 'desc' } });
      return tx.faq.create({ data: {
        id: randomBytes(12).toString('base64url'), ...input,
        sort_order: (lastFaq?.sort_order ?? 0) + 1, updated_at: new Date(),
      } });
    });

    return NextResponse.json({ 
      success: true, 
      faq,
      message: 'FAQ created successfully'
    });
  } catch (error) {
    return contentError(error, 'Failed to create FAQ');
  }
}

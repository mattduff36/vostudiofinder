import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// GET - Fetch all FAQs (public endpoint, no auth required)
export async function GET() {
  try {
    const faqs = await db.faq.findMany({
      orderBy: { sort_order: 'asc' }
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

    const body = await request.json();
    const { question, answer, sort_order } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    // Get the highest sort_order to append new FAQ at the end
    const lastFaq = await db.faq.findFirst({
      orderBy: { sort_order: 'desc' }
    });

    const newSortOrder = sort_order !== undefined 
      ? sort_order 
      : (lastFaq?.sort_order ?? 0) + 1;

    const faq = await db.faq.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        question,
        answer,
        sort_order: newSortOrder,
        updated_at: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      faq,
      message: 'FAQ created successfully'
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json(
      { error: 'Failed to create FAQ' },
      { status: 500 }
    );
  }
}

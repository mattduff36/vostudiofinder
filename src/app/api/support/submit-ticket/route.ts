import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { type, category, subject, message } = await request.json();

    // Validation
    if (!type || !['ISSUE', 'SUGGESTION'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid ticket type' },
        { status: 400 }
      );
    }

    if (!category || !message) {
      return NextResponse.json(
        { error: 'Category and message are required' },
        { status: 400 }
      );
    }

    // Create ticket
    const ticket = await db.support_tickets.create({
      data: {
        id: nanoid(),
        user_id: session.user.id,
        type,
        category,
        subject: subject || null,
        message,
        status: 'OPEN',
        priority: 'MEDIUM',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.log(`Support ticket created: ${ticket.id} by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
    });

  } catch (error) {
    logger.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to submit ticket' },
      { status: 500 }
    );
  }
}

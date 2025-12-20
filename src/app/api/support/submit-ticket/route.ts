import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    if (!type || !category || !message) {
      return NextResponse.json(
        { error: 'Type, category, and message are required' },
        { status: 400 }
      );
    }

    if (!['ISSUE', 'SUGGESTION'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid ticket type' },
        { status: 400 }
      );
    }

    // Check rate limit (5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ticketCount = await prisma.support_tickets.count({
      where: {
        user_id: session.user.id,
        created_at: {
          gte: today,
        },
      },
    });

    if (ticketCount >= 5) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 5 submissions per day.' },
        { status: 429 }
      );
    }

    // Get user info for email
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { email: true, username: true, display_name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create ticket
    const ticket = await prisma.support_tickets.create({
      data: {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: session.user.id,
        type,
        category,
        subject: subject || `${type === 'ISSUE' ? 'Issue' : 'Suggestion'}: ${category}`,
        message,
        status: 'OPEN',
        priority: type === 'ISSUE' ? 'HIGH' : 'MEDIUM',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Send email notification
    try {
      const emailSubject = `[${type}] ${ticket.subject}`;
      const emailBody = `
New ${type.toLowerCase()} submitted by ${user.display_name} (@${user.username})

Email: ${user.email}
Category: ${category}
Ticket ID: ${ticket.id}

Message:
${message}

---
Submitted: ${new Date().toISOString()}
User ID: ${session.user.id}
      `;

      await resend.emails.send({
        from: 'VoiceoverStudioFinder Support <support@voiceoverstudiofinder.com>',
        to: ['support@voiceoverstudiofinder.com', 'admin@mpdee.co.uk'],
        subject: emailSubject,
        text: emailBody,
      });

      logger.log(`✅ ${type} ticket created and email sent: ${ticket.id}`);
    } catch (emailError) {
      logger.error('Error sending support email:', emailError);
      // Continue even if email fails - ticket is saved in database
    }

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


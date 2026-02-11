import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { escapeHtml, formatRfc5322DisplayName } from '@/lib/utils/text';

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

    // --- ISSUE: send email to support inbox, do NOT store in DB ---
    if (type === 'ISSUE') {
      // Fetch user details for the email
      const user = await db.users.findUnique({
        where: { id: session.user.id },
        select: { email: true, display_name: true, username: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const supportEmail = 'support@voiceoverstudiofinder.com';
      
      // Format submission timestamp
      const submittedAt = new Date().toLocaleString('en-GB', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

      // Construct the FROM header with RFC 5322-safe display name (quoted, escaped)
      const displayPhrase = `${user.display_name} via Voiceover Studio Finder`;
      const fromName = formatRfc5322DisplayName(displayPhrase);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
      const fromHeader = `${fromName} <${fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail}>`;

      // Escape user-provided data before interpolation into HTML email templates
      const emailSent = await sendTemplatedEmail({
        to: supportEmail,
        templateKey: 'support-request',
        variables: {
          displayName: escapeHtml(user.display_name),
          username: escapeHtml(user.username),
          userEmail: escapeHtml(user.email),
          category: escapeHtml(category),
          submittedAt,
          message: escapeHtml(message),
        },
        fromOverride: fromHeader,
        replyToOverride: user.email,
        skipMarketingCheck: true,
      });

      if (!emailSent) {
        logger.error(`Failed to send support email for user ${session.user.id}`);
        return NextResponse.json(
          { error: 'Failed to send support email. Please try again.' },
          { status: 500 }
        );
      }

      logger.log(`Support issue emailed to ${supportEmail} from user ${session.user.id} (@${user.username})`);

      return NextResponse.json({
        success: true,
        message: 'Your issue has been sent to our support team. We\'ll get back to you soon.',
      });
    }

    // --- SUGGESTION: store in database as before ---
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

    logger.log(`Suggestion ticket created: ${ticket.id} by user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
    });

  } catch (error) {
    logger.error('Error processing support submission:', error);
    return NextResponse.json(
      { error: 'Failed to submit ticket' },
      { status: 500 }
    );
  }
}

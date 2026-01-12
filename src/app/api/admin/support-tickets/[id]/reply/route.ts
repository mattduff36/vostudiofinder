import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, display_name: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { message, updateStatus } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get ticket details
    const ticket = await db.support_tickets.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            email: true,
            display_name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Send email via Resend
    const emailSubject = ticket.type === 'ISSUE' 
      ? `Re: Your Issue Report - ${ticket.category}`
      : `Re: Your Suggestion - ${ticket.category}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'support@voiceoverstudiofinder.com',
      to: ticket.users.email,
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d42027;">Voiceover Studio Finder Support</h2>
          
          <p>Hi ${ticket.users.display_name},</p>
          
          <p>Thank you for your ${ticket.type === 'ISSUE' ? 'issue report' : 'suggestion'}. We've reviewed it and wanted to get back to you:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d42027; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            <strong>Original ${ticket.type === 'ISSUE' ? 'Issue' : 'Suggestion'}:</strong><br>
            <strong>Category:</strong> ${ticket.category}<br>
            ${ticket.subject ? `<strong>Subject:</strong> ${ticket.subject}<br>` : ''}
            <strong>Message:</strong> ${ticket.message}
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="font-size: 12px; color: #666;">
            If you have any further questions, please feel free to reply to this email.<br>
            Best regards,<br>
            The Voiceover Studio Finder Team
          </p>
        </div>
      `,
    });

    // Update ticket status if requested
    if (updateStatus) {
      const updateData: any = {
        status: updateStatus,
        updated_at: new Date(),
      };

      if (updateStatus === 'RESOLVED' || updateStatus === 'CLOSED') {
        updateData.resolved_at = new Date();
      }

      await db.support_tickets.update({
        where: { id },
        data: updateData,
      });
    }

    logger.log(`Admin ${session.user.id} replied to support ticket ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });

  } catch (error) {
    logger.error('Error sending support ticket reply:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}


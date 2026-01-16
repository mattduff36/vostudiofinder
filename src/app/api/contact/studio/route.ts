import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/email-service';
import { handleApiError } from '@/lib/sentry';
import { z } from 'zod';

const contactSchema = z.object({
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  ownerEmail: z.string().email(),
  senderName: z.string().min(1, 'Name is required'),
  senderEmail: z.string().email('Valid email is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = contactSchema.parse(body);
    
    const { studioName, ownerEmail, senderName, senderEmail, message } = validatedData;

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #d42027;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 8px 8px;
            }
            .message-box {
              background-color: white;
              padding: 20px;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
              margin: 20px 0;
            }
            .sender-info {
              background-color: #f3f4f6;
              padding: 15px;
              border-radius: 6px;
              margin-top: 20px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            h1 {
              margin: 0;
              font-size: 24px;
            }
            h2 {
              color: #d42027;
              font-size: 18px;
              margin-top: 0;
            }
            .label {
              font-weight: 600;
              color: #4b5563;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📧 New Booking Enquiry</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have received a new booking enquiry through <strong>VoiceoverStudioFinder.com</strong> for <strong>${studioName}</strong>.</p>
            
            <div class="message-box">
              <h2>Message:</h2>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>

            <div class="sender-info">
              <p class="label">From:</p>
              <p><strong>${senderName}</strong></p>
              <p class="label">Email:</p>
              <p><a href="mailto:${senderEmail}">${senderEmail}</a></p>
            </div>

            <p style="margin-top: 30px;">
              <strong>To reply:</strong> Simply reply to this email or contact ${senderName} directly at 
              <a href="mailto:${senderEmail}">${senderEmail}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>This enquiry was sent via VoiceoverStudioFinder.com</p>
            <p>© ${new Date().getFullYear()} VoiceoverStudioFinder. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Create plain text version
    const textContent = `
New Booking Enquiry - ${studioName}

You have received a new booking enquiry through VoiceoverStudioFinder.com

MESSAGE:
${message}

FROM: ${senderName}
EMAIL: ${senderEmail}

To reply, simply respond to this email or contact ${senderName} directly at ${senderEmail}

---
This enquiry was sent via VoiceoverStudioFinder.com
    `.trim();

    // Send email using Resend
    const emailSent = await sendEmail({
      from: process.env.RESEND_BOOKING_FROM_EMAIL || 'booking-enquiry@voiceoverstudiofinder.com',
      to: ownerEmail,
      replyTo: senderEmail, // Allow studio owner to reply directly
      subject: `New Booking Enquiry for ${studioName} from ${senderName}`,
      html: htmlContent,
      text: textContent,
    });

    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    console.log(`✅ Contact email sent to ${ownerEmail} for studio ${studioName}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Contact studio error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    
    handleApiError(error, 'Contact studio failed');
    
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}

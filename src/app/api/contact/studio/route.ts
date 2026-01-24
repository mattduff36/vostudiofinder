import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/email-service';
import { handleApiError } from '@/lib/error-logging';
import { z } from 'zod';

const contactSchema = z.object({
  studioId: z.string().min(1),
  studioName: z.string().min(1),
  ownerEmail: z.string().email(),
  senderName: z.string().min(1, 'Name is required').transform(val => val.trim()),
  senderEmail: z.string().email('Valid email is required').transform(val => val.trim()),
  message: z.string()
    .min(1, 'Message is required')
    .transform(val => val.trim())
    .pipe(z.string().min(40, 'Message must be at least 40 characters')),
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>New Booking Enquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px;">
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <div style="margin-bottom: 32px;">
                <img src="https://voiceoverstudiofinder.com/images/voiceover-studio-finder-logo-email-white-bg.png" alt="Voiceover Studio Finder" width="200" height="auto" style="max-width: 200px; height: auto; display: block;" />
              </div>
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">New enquiry received for ${studioName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">From</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 500; color: #1a1a1a; line-height: 1.6;">${senderName} &lt;<a href="mailto:${senderEmail}" style="color: #d42027; text-decoration: none;">${senderEmail}</a>&gt;</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Message</p>
                    <p style="margin: 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">To reply, simply respond to this email or contact ${senderName} directly at <a href="mailto:${senderEmail}" style="color: #d42027; text-decoration: underline;">${senderEmail}</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">Voiceover Studio Finder</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.</p>
              <p style="margin: 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">Questions? <a href="mailto:support@voiceoverstudiofinder.com" style="color: #d42027; text-decoration: underline;">support@voiceoverstudiofinder.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Create plain text version
    const textContent = `
New enquiry received for ${studioName}

FROM: ${senderName} <${senderEmail}>

MESSAGE:
${message}

To reply, simply respond to this email or contact ${senderName} directly at ${senderEmail}.

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
    `.trim();

    // Send email using Resend
    const emailSent = await sendEmail({
      from: `Voiceover Studio Finder <${process.env.RESEND_BOOKING_FROM_EMAIL || 'booking-enquiry@voiceoverstudiofinder.com'}>`,
      to: ownerEmail,
      replyTo: senderEmail, // Allow studio owner to reply directly
      subject: `New enquiry via Voiceover Studio Finder`,
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

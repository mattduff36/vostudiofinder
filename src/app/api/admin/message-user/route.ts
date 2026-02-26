import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/email-service';
import { z } from 'zod';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const messageSchema = z.object({
  username: z.string().min(1, 'Username is required').transform(val => val.trim()),
  message: z.string().min(1, 'Message is required').transform(val => val.trim()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === 'ADMIN' ||
      session?.user?.email === 'admin@mpdee.co.uk' ||
      session?.user?.username === 'VoiceoverGuy';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, message } = messageSchema.parse(body);

    const user = await db.users.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, email: true, display_name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://voiceoverstudiofinder.com';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message from Voiceover Studio Finder Admin</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px;">
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <div style="margin-bottom: 32px;">
                <img src="${baseUrl}/images/voiceover-studio-finder-logo-email-white-bg.png" alt="Voiceover Studio Finder" width="200" height="auto" style="max-width: 200px; height: auto; display: block;" />
              </div>
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Message from Voiceover Studio Finder Admin</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">Hi ${escapeHtml(user.display_name)},</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">${safeMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">If you have any questions, please reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">Voiceover Studio Finder</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">&copy; ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.</p>
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

    const textContent = `
Message from Voiceover Studio Finder Admin

Hi ${user.display_name},

${message}

If you have any questions, please reply to this email.

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
    `.trim();

    const rawFrom = process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
    const fromEmail = rawFrom.match(/<(.+)>/)?.[1] || rawFrom;
    const replyTo = process.env.RESEND_REPLY_TO_EMAIL || 'support@voiceoverstudiofinder.com';

    const emailSent = await sendEmail({
      from: `Voiceover Studio Finder Admin <${fromEmail}>`,
      to: user.email,
      replyTo,
      subject: 'Message from Voiceover Studio Finder Admin',
      html: htmlContent,
      text: textContent,
    });

    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    console.log(`✅ Admin message sent to ${user.email} (username: ${username}) by admin ${session.user.email}`);

    return NextResponse.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('❌ Admin message-user error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}

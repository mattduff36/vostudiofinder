/**
 * Legacy User Announcement Email Template
 * 
 * Purpose: Announce new website launch and invite legacy users back with 6 months free
 */

import { generateResetToken } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export interface LegacyUserAnnouncementProps {
  userEmail: string;
  displayName: string;
  resetPasswordUrl: string;
}

/**
 * Helper function to generate a password reset token and URL for a legacy user
 * This creates a direct link that allows the user to set their password immediately
 */
export async function generateLegacyUserResetUrl(userEmail: string): Promise<string> {
  // Find user
  const user = await db.users.findUnique({
    where: { email: userEmail.toLowerCase() },
  });

  if (!user) {
    throw new Error(`User not found: ${userEmail}`);
  }

  // Generate reset token
  const resetToken = await generateResetToken();
  const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 3600000); // 7 days for legacy users (longer expiry)

  // Save reset token to database
  await db.users.update({
    where: { id: user.id },
    data: {
      reset_token: resetToken,
      reset_token_expiry: resetTokenExpiry,
      updated_at: new Date(),
    },
  });

  // Build reset URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://voiceoverstudiofinder.com';
  const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

  return resetUrl;
}

export function generateLegacyUserAnnouncementEmail({
  userEmail,
  displayName,
  resetPasswordUrl,
}: LegacyUserAnnouncementProps): { 
  subject: string;
  previewText: string;
  html: string;
  text: string;
} {
  const subject = 'Voiceover Studio Finder is back!';
  const previewText = 'We\'ve rebuilt the platform. Six months of free membership is waiting for you.';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Voiceover Studio Finder is live</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; margin: 0; padding: 0; width: 100%; min-width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px; overflow: hidden; margin: 0 auto;">
          <!-- Hero Section -->
          <tr>
            <td style="padding: 0; background-color: #1a1a1a; line-height: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0; padding: 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <!-- Hero Image with proper aspect ratio control -->
                    <img src="https://voiceoverstudiofinder.com/images/its-back-voiceover-studio-finder-email-header.png" alt="It's back... Voiceover Studio Finder - Professional Voiceover, Podcast & Broadcast Studios Worldwide. Verified locations. No commission. Direct studio contact." width="600" style="display: block; width: 100%; max-width: 600px; height: auto; margin: 0; padding: 0; border: 0; outline: none; line-height: 100%; -ms-interpolation-mode: bicubic;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Section -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a; line-height: 1.6; font-weight: 500;">Hi ${displayName},</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Voiceover Studio Finder is back, and we're genuinely excited to share it with you!</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We've rebuilt everything. The platform is faster. The search is smarter. The design is beautifully clean.</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Every feature has been meticulously rethought and redesigned. Every interaction has been refined. Every detail matters.</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">You've been part of our community from the beginning. That's why <strong>six months of free membership</strong> starts the moment you sign in and see your new profile.</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Thank you for being a member. We can't wait to show you what we've built!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Your account</p>
                    <p style="margin: 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">${userEmail}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Click the button below to set your password and sign in instantly.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${resetPasswordUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Set password and sign in
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${resetPasswordUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Set password and sign in</span>
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">If the button doesn't work, copy and paste this link:</p>
              <p style="margin: 0; font-size: 14px; color: #1a1a1a; word-break: break-all; line-height: 1.6;"><a href="${resetPasswordUrl}" style="color: #d42027; text-decoration: underline;">${resetPasswordUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We're looking forward to welcoming you back.</p>
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

  const text = `
Voiceover Studio Finder is back!

Hi ${displayName},

Voiceover Studio Finder is back, and we're genuinely excited to share it with you!

We've rebuilt everything. The platform is faster. The search is smarter. The design is beautifully clean.

Every feature has been meticulously rethought and redesigned. Every interaction has been refined. Every detail matters.

You've been part of our community from the beginning. That's why *six months of free membership* starts the moment you sign in and see your new profile.

Thank you for being a member. We can't wait to show you what we've built!

Your account: ${userEmail}

Click this link to set your password and sign in instantly:
${resetPasswordUrl}

We're looking forward to welcoming you back.

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
  `.trim();

  return { subject, previewText, html, text };
}


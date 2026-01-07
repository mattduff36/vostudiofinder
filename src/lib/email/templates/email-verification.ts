/**
 * Email Verification Template
 * 
 * Purpose: Verify user email address during account creation
 */

export interface EmailVerificationProps {
  verificationUrl: string;
  userEmail: string;
  displayName: string;
}

export function generateEmailVerificationEmail({
  verificationUrl,
  userEmail,
  displayName,
}: EmailVerificationProps): { html: string; text: string } {
  const subject = 'Verify your email address';
  const previewText = 'Click the link to verify your email and activate your account.';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px;">
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <div style="font-size: 20px; font-weight: 500; color: #1a1a1a; margin-bottom: 24px;">VoiceoverStudioFinder</div>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Verify your email address</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We received a request to create an account for ${userEmail}. Verify your email address to activate your account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Verify email address</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 0; font-size: 14px; color: #1a1a1a; word-break: break-all; line-height: 1.6;"><a href="${verificationUrl}" style="color: #1a1a1a; text-decoration: underline;">${verificationUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">VoiceoverStudioFinder</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">© ${new Date().getFullYear()} VoiceoverStudioFinder. All rights reserved.</p>
              <p style="margin: 0; font-size: 13px; color: #6a6a6a; line-height: 1.6;">If you have questions, contact us at <a href="mailto:support@voiceoverstudiofinder.com" style="color: #1a1a1a; text-decoration: underline;">support@voiceoverstudiofinder.com</a></p>
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
Verify your email address

We received a request to create an account for ${userEmail}. Verify your email address to activate your account.

Verify your email:
${verificationUrl}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.

---
VoiceoverStudioFinder
© ${new Date().getFullYear()} VoiceoverStudioFinder. All rights reserved.
If you have questions, contact us at support@voiceoverstudiofinder.com
  `.trim();

  return { html, text };
}

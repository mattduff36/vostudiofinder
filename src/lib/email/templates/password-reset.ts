/**
 * Password Reset Email Template
 * 
 * Purpose: Allow users to reset their password
 */

export interface PasswordResetEmailProps {
  resetUrl: string;
  userEmail: string;
}

export function generatePasswordResetEmail({
  resetUrl,
  userEmail,
}: PasswordResetEmailProps): { html: string; text: string } {
  const subject = 'Reset your password';
  const previewText = 'Click the link to reset your password. This link expires in 1 hour.';

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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Reset your password</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We received a request to reset the password for your account (${userEmail}). Click the button below to set a new password.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Reset password</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 0; font-size: 14px; color: #1a1a1a; word-break: break-all; line-height: 1.6;"><a href="${resetUrl}" style="color: #1a1a1a; text-decoration: underline;">${resetUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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
Reset your password

We received a request to reset the password for your account (${userEmail}). Click the link below to set a new password.

Reset your password:
${resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
VoiceoverStudioFinder
© ${new Date().getFullYear()} VoiceoverStudioFinder. All rights reserved.
If you have questions, contact us at support@voiceoverstudiofinder.com
  `.trim();

  return { html, text };
}

/**
 * Welcome Email Template
 * 
 * Purpose: Welcome new users after account creation
 */

export interface WelcomeEmailData {
  display_name: string;
  email: string;
  verificationUrl: string;
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData) {
  const { display_name, verificationUrl } = data;
  
  const subject = 'Welcome to VoiceoverStudioFinder';
  const previewText = 'Verify your email address to get started.';

  return {
    subject,
    html: `
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Welcome, ${display_name}</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Your account has been created. Verify your email address to get started.</p>
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
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">This verification link expires in 24 hours.</p>
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
    `.trim(),
    text: `
Welcome to VoiceoverStudioFinder

Welcome, ${display_name}. Your account has been created. Verify your email address to get started.

Verify your email:
${verificationUrl}

This verification link expires in 24 hours.

---
VoiceoverStudioFinder
© ${new Date().getFullYear()} VoiceoverStudioFinder. All rights reserved.
If you have questions, contact us at support@voiceoverstudiofinder.com
    `.trim(),
  };
}

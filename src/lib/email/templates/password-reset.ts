/**
 * Password Reset Email Template
 * 
 * Generates HTML email for password reset requests
 * Matches VoiceoverStudioFinder brand and tone
 */

export interface PasswordResetEmailProps {
  resetUrl: string;
  userEmail: string;
}

export function generatePasswordResetEmail({
  resetUrl,
  userEmail,
}: PasswordResetEmailProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #ffffff;
      padding: 30px 20px 20px 20px;
      text-align: center;
      border-bottom: 3px solid #d42027;
    }
    .logo-image {
      max-width: 300px;
      height: auto;
      margin: 0 auto;
    }
    .content {
      padding: 40px 30px;
      background-color: #ffffff;
    }
    h1 {
      color: #1f2937;
      font-size: 26px;
      margin: 0 0 20px 0;
      font-weight: 600;
    }
    p {
      color: #4b5563;
      font-size: 16px;
      margin: 0 0 16px 0;
      line-height: 1.7;
    }
    .highlight {
      color: #d42027;
      font-weight: 600;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background-color: #d42027;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 2px 4px rgba(212, 32, 39, 0.3);
    }
    .button:hover {
      background-color: #b61b21;
    }
    .alternative-link {
      margin-top: 28px;
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .alternative-link p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .alternative-link a {
      color: #d42027;
      font-size: 13px;
      word-break: break-all;
      text-decoration: underline;
    }
    .info-box {
      margin-top: 28px;
      padding: 20px;
      background-color: #fef2f2;
      border-left: 4px solid #d42027;
      border-radius: 4px;
    }
    .info-box p {
      color: #7f1d1d;
      font-size: 14px;
      margin: 0 0 8px 0;
      line-height: 1.6;
    }
    .info-box p:last-child {
      margin: 0;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 32px 0;
    }
    .footer {
      padding: 30px 30px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .footer p {
      color: #6b7280;
      font-size: 13px;
      margin: 0 0 8px 0;
    }
    .footer p:last-child {
      margin: 0;
    }
    .footer-tagline {
      color: #9ca3af;
      font-size: 12px;
      font-style: italic;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <img src="https://voiceoverstudiofinder.com/images/voiceover-studio-finder-header-logo2-black.png" alt="VoiceoverStudioFinder" class="logo-image" />
      </div>
      
      <div class="content">
        <h1>Reset Your Password</h1>
        
        <p>Hello,</p>
        
        <p>We received a request to reset the password for your <span class="highlight">VoiceoverStudioFinder</span> account (<strong>${userEmail}</strong>).</p>
        
        <p>Finding a great recording studio shouldn't be hard — and neither should accessing your account. Click the button below to set a new password and get back to connecting with professional studios.</p>
        
        <div class="button-container">
          <a href="${resetUrl}" class="button">Reset My Password</a>
        </div>
        
        <div class="alternative-link">
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <a href="${resetUrl}">${resetUrl}</a>
        </div>
        
        <div class="info-box">
          <p><strong>⏱️ This link expires in 1 hour</strong></p>
          <p>For security, password reset links are only valid for one hour. If yours expires, just request a new one.</p>
        </div>

        <div class="divider"></div>
        
        <p style="font-size: 14px; color: #6b7280;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account stays secure.</p>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} VoiceoverStudioFinder</p>
        <p>Connecting voice artists, podcasters, and producers with professional recording studios worldwide</p>
        <p class="footer-tagline">Simple, transparent, and built by people who actually record for a living.</p>
        <p style="margin-top: 16px; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Reset Your Password - VoiceoverStudioFinder

Hello,

We received a request to reset the password for your VoiceoverStudioFinder account (${userEmail}).

Finding a great recording studio shouldn't be hard — and neither should accessing your account. Click the link below to set a new password and get back to connecting with professional studios.

Reset your password:
${resetUrl}

⏱️ This link expires in 1 hour

For security, password reset links are only valid for one hour. If yours expires, just request a new one.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged and your account stays secure.

---
© ${new Date().getFullYear()} VoiceoverStudioFinder
Connecting voice artists, podcasters, and producers with professional recording studios worldwide

Simple, transparent, and built by people who actually record for a living.

This is an automated email. Please do not reply.
  `.trim();

  return { html, text };
}

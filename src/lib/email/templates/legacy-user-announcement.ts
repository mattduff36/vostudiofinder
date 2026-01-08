/**
 * Legacy User Announcement Email Template
 * 
 * Purpose: Announce new website launch and invite legacy users back with 6 months free
 */

export interface LegacyUserAnnouncementProps {
  userEmail: string;
  displayName: string;
  signinUrl: string;
  forgotPasswordUrl: string;
}

export function generateLegacyUserAnnouncementEmail({
  userEmail,
  displayName,
  signinUrl,
  forgotPasswordUrl,
}: LegacyUserAnnouncementProps): { 
  subject: string;
  previewText: string;
  html: string;
  text: string;
} {
  const subject = 'Voiceover Studio Finder is back!';
  const previewText = 'The NEW site is live. Claim your 6 months free membership!';

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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 4px; overflow: hidden;">
          <!-- Hero Section -->
          <tr>
            <td style="padding: 0; background: linear-gradient(135deg, #1a1a1a 0%, #2d1f1f 100%); background-color: #1a1a1a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 60px 40px 50px 40px;">
                    <div style="margin-bottom: 40px;">
                      <img src="https://voiceoverstudiofinder.com/images/voiceover-studio-finder-logo-email-white-bg.png" alt="Voiceover Studio Finder" width="300" height="auto" style="max-width: 300px; height: auto; display: block; margin: 0 auto;" />
                    </div>
                    <h1 style="margin: 0 0 12px 0; font-size: 36px; font-weight: 600; color: #ffffff; line-height: 1.2; text-align: center; letter-spacing: -0.5px;">Voiceover Studio Finder is back!</h1>
                    <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: 500; color: #d42027; line-height: 1.3; text-align: center;">The NEW site is now live.</p>
                    <p style="margin: 16px 0 0 0; font-size: 16px; color: #e0e0e0; line-height: 1.5; text-align: center;">Faster, smarter, better designed</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Section -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #1a1a1a; line-height: 1.6; font-weight: 500;">Hi ${displayName},</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We've completely rebuilt Voiceover Studio Finder from the ground up! The new site is faster, easier to use, and beautifully designed for finding voiceover studios worldwide.</p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">As one of our legacy users, you're eligible for <strong style="color: #d42027;">six months of free membership</strong>. This starts immediately when you sign in!</p>
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
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">To regain access, simply use the <a href="${forgotPasswordUrl}" style="color: #d42027; text-decoration: underline;">Forgot password</a> link. You'll receive an email to set a new password and get started!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${signinUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Sign in and claim 6 months free
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${signinUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Sign in and claim 6 months free</span>
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
              <p style="margin: 0; font-size: 14px; color: #1a1a1a; word-break: break-all; line-height: 1.6;"><a href="${signinUrl}" style="color: #d42027; text-decoration: underline;">${signinUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We're excited to welcome you back and show you everything that's new!</p>
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

The NEW site is now live.

Hi ${displayName},

We've completely rebuilt Voiceover Studio Finder from the ground up! The new site is faster, easier to use, and beautifully designed for finding voiceover studios worldwide.

As one of our legacy users, you're eligible for six months of free membership. This starts immediately when you sign in!

Your account: ${userEmail}

To regain access, simply use the Forgot password link: ${forgotPasswordUrl}

You'll receive an email to set a new password and get started!

Sign in and claim 6 months free:
${signinUrl}

We're excited to welcome you back and show you everything that's new!

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
  `.trim();

  return { subject, previewText, html, text };
}


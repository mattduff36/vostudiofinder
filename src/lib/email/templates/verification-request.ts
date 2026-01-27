/**
 * Verification Request Email Template
 * 
 * Purpose: Notify admins when a studio owner requests verified status
 */

export interface VerificationRequestEmailData {
  studioOwnerName: string;
  studioName: string;
  username: string;
  email: string;
  profileCompletion: number;
  studioUrl: string;
  adminDashboardUrl: string;
}

export function generateVerificationRequestEmail(data: VerificationRequestEmailData) {
  const { studioOwnerName, studioName, username, email, profileCompletion, studioUrl, adminDashboardUrl } = data;
  
  return {
    subject: `Verification Request - ${studioName} (@${username})`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Verification Request</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
  </style>
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Verification Request Received</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">A studio owner has requested verified status for their profile.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 0 0 12px 0;">
                          <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Studio Name</p>
                          <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 500; color: #1a1a1a; line-height: 1.6;">${studioName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
                          <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Owner</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">${studioOwnerName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
                          <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Username</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">@${username}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
                          <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Email</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 0 0; border-top: 1px solid #e5e5e5;">
                          <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Profile Completion</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; color: #1a1a1a; line-height: 1.6;">
                            <span style="display: inline-block; padding: 4px 12px; background-color: ${profileCompletion >= 85 ? '#dcfce7' : '#fef2f2'}; color: ${profileCompletion >= 85 ? '#166534' : '#991b1b'}; border-radius: 4px; font-weight: 500;">
                              ${profileCompletion}%
                            </span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px; padding-bottom: 12px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${studioUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        View studio profile
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${studioUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">View studio profile</span>
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${adminDashboardUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="12%"
                      stroke="f" fillcolor="#22c55e">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Review in admin
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${adminDashboardUrl}"
                      style="background:#22c55e;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Review in admin</span>
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e; line-height: 1.6;">Review Checklist:</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #92400e; line-height: 1.8;">
                      <li>Profile is at least 85% complete</li>
                      <li>Studio information is accurate and professional</li>
                      <li>Contact details are valid</li>
                      <li>Images meet quality standards</li>
                      <li>No policy violations</li>
                    </ul>
                  </td>
                </tr>
              </table>
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
    `.trim(),
    text: `
Verification Request Received

A studio owner has requested verified status for their profile.

Studio Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Studio Name: ${studioName}
Owner: ${studioOwnerName}
Username: @${username}
Email: ${email}
Profile Completion: ${profileCompletion}%

View studio profile:
${studioUrl}

Review in admin dashboard:
${adminDashboardUrl}

Review Checklist:
• Profile is at least 85% complete
• Studio information is accurate and professional
• Contact details are valid
• Images meet quality standards
• No policy violations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
    `.trim(),
  };
}

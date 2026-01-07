/**
 * Username Reservation Email Templates
 * 
 * Purpose: Re-engagement and payment retry campaigns for username reservations
 */

export const paymentFailedReservationTemplate = (data: {
  displayName: string;
  username: string;
  amount: string;
  currency: string;
  errorMessage: string;
  reservationExpiresAt: string;
  retryUrl: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Payment issue with your signup</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
    [data-ogsc] .btn a, [data-ogsc] .btn a span { color: #FFFFFF !important; }
    [data-ogsb] .btn a, [data-ogsb] .btn a span { color: #FFFFFF !important; }
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Payment issue with your signup</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We couldn't process your payment. Your username @${data.username} is reserved until ${data.reservationExpiresAt}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef2f2; border-left: 3px solid #d42027; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;"><strong>Error:</strong> ${data.errorMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Reserved username</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 500; color: #1a1a1a; line-height: 1.6; font-family: monospace;">@${data.username}</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Reserved until ${data.reservationExpiresAt}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${data.retryUrl}" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Retry payment
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${data.retryUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Retry payment</span>
                    </a>
                    <!--<![endif]-->
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
  `.trim();
};

export const reservationReminderDay2Template = (data: {
  displayName: string;
  username: string;
  reservationExpiresAt: string;
  daysRemaining: number;
  signupUrl: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Complete your signup</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
    [data-ogsc] .btn a, [data-ogsc] .btn a span { color: #FFFFFF !important; }
    [data-ogsb] .btn a, [data-ogsb] .btn a span { color: #FFFFFF !important; }
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Complete your signup</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">You started signing up but didn't complete your payment. Your username @${data.username} is reserved until ${data.reservationExpiresAt}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Reserved username</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 500; color: #1a1a1a; line-height: 1.6; font-family: monospace;">@${data.username}</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">${data.daysRemaining} days remaining</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${data.signupUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Complete signup
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${data.signupUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Complete signup</span>
                    </a>
                    <!--<![endif]-->
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
  `.trim();
};

export const reservationUrgencyDay5Template = (data: {
  displayName: string;
  username: string;
  reservationExpiresAt: string;
  daysRemaining: number;
  signupUrl: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Your username reservation expires in ${data.daysRemaining} days</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
    [data-ogsc] .btn a, [data-ogsc] .btn a span { color: #FFFFFF !important; }
    [data-ogsb] .btn a, [data-ogsb] .btn a span { color: #FFFFFF !important; }
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Your username reservation expires in ${data.daysRemaining} days</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Complete your signup before ${data.reservationExpiresAt} to keep @${data.username}. After this date, the username will become available to others.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Reserved username</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 500; color: #1a1a1a; line-height: 1.6; font-family: monospace;">@${data.username}</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Expires ${data.reservationExpiresAt}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${data.signupUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Complete signup
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${data.signupUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Complete signup</span>
                    </a>
                    <!--<![endif]-->
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
  `.trim();
};

export const reservationExpiredTemplate = (data: {
  displayName: string;
  username: string;
  signupUrl: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Your username reservation has expired</title>
  <style>
    .btn a, .btn a span { color: #FFFFFF !important; }
    [data-ogsc] .btn a, [data-ogsc] .btn a span { color: #FFFFFF !important; }
    [data-ogsb] .btn a, [data-ogsb] .btn a span { color: #FFFFFF !important; }
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Your username reservation has expired</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">The reservation for @${data.username} has expired and is now available to others. Your signup data has been removed.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Username</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 500; color: #6a6a6a; line-height: 1.6; font-family: monospace; text-decoration: line-through;">@${data.username}</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">Reservation expired</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">If you'd like to join Voiceover Studio Finder, you can sign up again. The username @${data.username} may or may not still be available.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="${data.signupUrl}" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        Sign up again
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${data.signupUrl}"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">Sign up again</span>
                    </a>
                    <!--<![endif]-->
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
  `.trim();
};

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
  const subject = 'Payment issue with your signup';
  const previewText = `We couldn't process your payment. Your username @${data.username} is still reserved.`;

  return `
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Payment issue with your signup</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">We couldn't process your payment. Your username @${data.username} is still reserved until ${data.reservationExpiresAt}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px;">
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${data.retryUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Retry payment</a>
                  </td>
                </tr>
              </table>
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
};

export const reservationReminderDay2Template = (data: {
  displayName: string;
  username: string;
  reservationExpiresAt: string;
  daysRemaining: number;
  signupUrl: string;
}) => {
  const subject = 'Complete your signup';
  const previewText = `Your username @${data.username} is reserved. Complete your signup to activate your account.`;

  return `
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${data.signupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Complete signup</a>
                  </td>
                </tr>
              </table>
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
};

export const reservationUrgencyDay5Template = (data: {
  displayName: string;
  username: string;
  reservationExpiresAt: string;
  daysRemaining: number;
  signupUrl: string;
}) => {
  const subject = `Your username reservation expires in ${data.daysRemaining} days`;
  const previewText = `Complete your signup before ${data.reservationExpiresAt} to keep @${data.username}.`;

  return `
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${data.signupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Complete signup</a>
                  </td>
                </tr>
              </table>
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
};

export const reservationExpiredTemplate = (data: {
  displayName: string;
  username: string;
  signupUrl: string;
}) => {
  const subject = 'Your username reservation has expired';
  const previewText = `The reservation for @${data.username} has expired. You can sign up again if you'd like.`;

  return `
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
              <p style="margin: 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">If you'd like to join VoiceoverStudioFinder, you can sign up again. The username @${data.username} may or may not still be available.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <a href="${data.signupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Sign up again</a>
                  </td>
                </tr>
              </table>
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
};

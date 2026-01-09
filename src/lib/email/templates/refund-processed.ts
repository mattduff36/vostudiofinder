/**
 * Refund Processed Email Template
 * 
 * Purpose: Notify users when a refund has been processed
 */

export interface RefundProcessedProps {
  displayName: string;
  refundAmount: string;
  currency: string;
  paymentAmount: string;
  isFullRefund: boolean;
  comment?: string | null;
  refundDate: string;
}

export function generateRefundProcessedEmail({
  displayName,
  refundAmount,
  currency,
  paymentAmount,
  isFullRefund,
  comment,
  refundDate,
}: RefundProcessedProps): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Refund processed</title>
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
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #1a1a1a; line-height: 1.3;">Refund processed</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a4a; line-height: 1.6;">Hi ${displayName},<br><br>We've processed a ${isFullRefund ? 'full' : 'partial'} refund of ${refundAmount} ${currency.toUpperCase()} for your payment of ${paymentAmount} ${currency.toUpperCase()}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0f9ff; border-left: 3px solid #d42027; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e40af; line-height: 1.6;"><strong>Refund Details:</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e40af; line-height: 1.6;">Amount: ${refundAmount} ${currency.toUpperCase()}</p>
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #1e40af; line-height: 1.6;">Date: ${refundDate}</p>
                    <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">Type: ${isFullRefund ? 'Full refund' : 'Partial refund'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${comment ? `
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-left: 3px solid #6b7280; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; line-height: 1.6;"><strong>Note:</strong></p>
                    <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">${comment.replace(/\n/g, '<br>')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">The refund will appear in your account within 5-10 business days, depending on your bank or card issuer.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" class="btn" style="border-radius: 6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                      href="https://voiceoverstudiofinder.com/dashboard" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="12%"
                      stroke="f" fillcolor="#d42027">
                      <w:anchorlock/>
                      <center style="color:#FFFFFF;font-family:Arial, sans-serif;font-size:16px;font-weight:bold;">
                        View Dashboard
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="https://voiceoverstudiofinder.com/dashboard"
                      style="background:#d42027;border-radius:6px;color:#FFFFFF !important;display:inline-block;
                      font-family:Arial, sans-serif;font-size:16px;font-weight:700;line-height:48px;text-align:center;
                      text-decoration:none !important;padding:0 28px;-webkit-text-size-adjust:none;">
                      <span style="color:#FFFFFF !important;display:inline-block;">View Dashboard</span>
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6a6a6a; line-height: 1.6;">If you have any questions about this refund, please contact our support team.</p>
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
Refund processed

Hi ${displayName},

We've processed a ${isFullRefund ? 'full' : 'partial'} refund of ${refundAmount} ${currency.toUpperCase()} for your payment of ${paymentAmount} ${currency.toUpperCase()}.

Refund Details:
Amount: ${refundAmount} ${currency.toUpperCase()}
Date: ${refundDate}
Type: ${isFullRefund ? 'Full refund' : 'Partial refund'}
${comment ? `\nNote:\n${comment}\n` : ''}
The refund will appear in your account within 5-10 business days, depending on your bank or card issuer.

View Dashboard: https://voiceoverstudiofinder.com/dashboard

If you have any questions about this refund, please contact our support team.

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
  `.trim();

  return { html, text };
}

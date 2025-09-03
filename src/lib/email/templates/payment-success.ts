export const paymentSuccessTemplate = (data: {
  customerName: string;
  amount: string;
  currency: string;
  invoiceNumber: string;
  planName: string;
  nextBillingDate: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation - VoiceoverStudioFinder</title>
  <style>
    body { 
      font-family: 'Raleway', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #f39c12; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    .logo { 
      font-size: 24px; 
      font-weight: bold; 
      color: #f39c12; 
    }
    .success-icon {
      font-size: 48px;
      color: #27ae60;
      margin: 20px 0;
    }
    .amount {
      font-size: 32px;
      font-weight: bold;
      color: #27ae60;
      margin: 20px 0;
    }
    .details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .details h3 {
      margin-top: 0;
      color: #2c3e50;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #f39c12;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
      border-top: 1px solid #ecf0f1;
      padding-top: 20px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">VoiceoverStudioFinder</div>
      <div class="success-icon">✅</div>
      <h1>Payment Successful!</h1>
    </div>

    <p>Hi ${data.customerName},</p>

    <p>Thank you for your payment! We've successfully processed your subscription payment.</p>

    <div class="amount">${data.amount} ${data.currency.toUpperCase()}</div>

    <div class="details">
      <h3>Payment Details</h3>
      <div class="detail-row">
        <span>Invoice Number:</span>
        <span><strong>${data.invoiceNumber}</strong></span>
      </div>
      <div class="detail-row">
        <span>Plan:</span>
        <span><strong>${data.planName}</strong></span>
      </div>
      <div class="detail-row">
        <span>Next Billing Date:</span>
        <span><strong>${data.nextBillingDate}</strong></span>
      </div>
    </div>

    <p>Your premium studio features are now active! You can now:</p>
    <ul>
      <li>Feature your studio listing</li>
      <li>Upload unlimited photos</li>
      <li>Receive priority placement in search results</li>
      <li>Access detailed analytics</li>
    </ul>

    <div class="cta">
      <a href="https://voiceoverstudiofinder.com/dashboard" class="button">
        Access Your Dashboard
      </a>
    </div>

    <p>If you have any questions about your subscription or need help with your studio listing, please don't hesitate to contact our support team.</p>

    <div class="footer">
      <p>
        © 2024 VoiceoverStudioFinder. All rights reserved.<br>
        <a href="https://voiceoverstudiofinder.com/unsubscribe">Unsubscribe</a> |
        <a href="https://voiceoverstudiofinder.com/support">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

export const paymentFailedTemplate = (data: {
  customerName: string;
  amount: string;
  currency: string;
  reason: string;
  retryDate?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - VoiceoverStudioFinder</title>
  <style>
    body { 
      font-family: 'Raleway', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #e74c3c; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    .logo { 
      font-size: 24px; 
      font-weight: bold; 
      color: #f39c12; 
    }
    .error-icon {
      font-size: 48px;
      color: #e74c3c;
      margin: 20px 0;
    }
    .amount {
      font-size: 24px;
      color: #e74c3c;
      margin: 20px 0;
    }
    .reason {
      background: #fdf2f2;
      border: 1px solid #fca5a5;
      padding: 15px;
      border-radius: 6px;
      color: #dc2626;
      margin: 20px 0;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #e74c3c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
      border-top: 1px solid #ecf0f1;
      padding-top: 20px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">VoiceoverStudioFinder</div>
      <div class="error-icon">❌</div>
      <h1>Payment Failed</h1>
    </div>

    <p>Hi ${data.customerName},</p>

    <p>We were unable to process your payment for your VoiceoverStudioFinder subscription.</p>

    <div class="amount">Failed Payment: ${data.amount} ${data.currency.toUpperCase()}</div>

    <div class="reason">
      <strong>Reason:</strong> ${data.reason}
    </div>

    ${data.retryDate ? `<p>We'll automatically retry your payment on <strong>${data.retryDate}</strong>. Please ensure your payment method is up to date.</p>` : ''}

    <p>To avoid any interruption to your premium features, please update your payment method or try a different card.</p>

    <div class="cta">
      <a href="https://voiceoverstudiofinder.com/billing" class="button">
        Update Payment Method
      </a>
    </div>

    <p>If you continue to experience issues, please contact our support team for assistance.</p>

    <div class="footer">
      <p>
        © 2024 VoiceoverStudioFinder. All rights reserved.<br>
        <a href="https://voiceoverstudiofinder.com/support">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

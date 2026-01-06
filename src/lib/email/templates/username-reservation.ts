/**
 * Email templates for Username Reservation System
 * Used for re-engagement and payment retry campaigns
 */

export const paymentFailedReservationTemplate = (data: {
  displayName: string;
  username: string;
  amount: string;
  currency: string;
  errorMessage: string;
  reservationExpiresAt: string; // Formatted date
  retryUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Issue - Complete Your Signup</title>
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
    .warning-icon {
      font-size: 48px;
      color: #f39c12;
      margin: 20px 0;
    }
    .username-badge {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .username-badge .username {
      font-size: 24px;
      font-weight: bold;
      color: #b45309;
      font-family: monospace;
    }
    .username-badge .reserved {
      color: #92400e;
      font-size: 14px;
      margin-top: 5px;
    }
    .error-box {
      background: #fef2f2;
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
      background: #dc2626;
      color: white;
      padding: 15px 40px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background: #b91c1c;
    }
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
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
      <div class="warning-icon">⚠️</div>
      <h1>Payment Issue</h1>
    </div>

    <p>Hi ${data.displayName},</p>

    <p>We tried to process your payment for VoiceoverStudioFinder, but unfortunately it didn't go through.</p>

    <div class="error-box">
      <strong>Error:</strong> ${data.errorMessage}
    </div>

    <p><strong>Good news:</strong> Your username is still reserved for you!</p>

    <div class="username-badge">
      <div class="username">@${data.username}</div>
      <div class="reserved">Reserved until ${data.reservationExpiresAt}</div>
    </div>

    <div class="info-box">
      <strong>💡 Why this happened:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Your card may have been declined</li>
        <li>Insufficient funds in your account</li>
        <li>Your card details may need updating</li>
      </ul>
    </div>

    <p>Don't lose your username! Complete your payment now to secure <strong>@${data.username}</strong> and activate your membership.</p>

    <div class="cta">
      <a href="${data.retryUrl}" class="button">
        Retry Payment Now - ${data.amount} ${data.currency}
      </a>
    </div>

    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Need help? Just reply to this email or contact <a href="mailto:support@voiceoverstudiofinder.com">support@voiceoverstudiofinder.com</a>
    </p>

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

export const reservationReminderDay2Template = (data: {
  displayName: string;
  username: string;
  reservationExpiresAt: string;
  daysRemaining: number;
  signupUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Signup - ${data.daysRemaining} Days Left</title>
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
    .reminder-icon {
      font-size: 48px;
      margin: 20px 0;
    }
    .username-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .username-badge .username {
      font-size: 28px;
      font-weight: bold;
      font-family: monospace;
    }
    .username-badge .reserved {
      font-size: 14px;
      margin-top: 5px;
      opacity: 0.9;
    }
    .countdown {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .countdown .days {
      font-size: 48px;
      font-weight: bold;
      color: #b45309;
    }
    .countdown .label {
      color: #92400e;
      font-size: 16px;
    }
    .benefits {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .benefits h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .benefits ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .benefits li {
      margin: 8px 0;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #f39c12;
      color: white;
      padding: 15px 40px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background: #e67e22;
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
      <div class="reminder-icon">⏰</div>
      <h1>Your Username is Waiting!</h1>
    </div>

    <p>Hi ${data.displayName},</p>

    <p>You started signing up for VoiceoverStudioFinder, but didn't complete your payment.</p>

    <p><strong>Good news:</strong> Your username is still available!</p>

    <div class="username-badge">
      <div class="username">@${data.username}</div>
      <div class="reserved">✓ Reserved for you</div>
    </div>

    <div class="countdown">
      <div class="days">${data.daysRemaining}</div>
      <div class="label">Days left to claim your username</div>
    </div>

    <p>After <strong>${data.reservationExpiresAt}</strong>, your username will expire and become available for others to claim.</p>

    <div class="benefits">
      <h3>🎯 What You'll Get:</h3>
      <ul>
        <li><strong>Your own studio page:</strong> voiceoverstudiofinder.com/@${data.username}</li>
        <li><strong>Featured listing</strong> in our studio directory</li>
        <li><strong>Direct bookings</strong> from voice artists worldwide</li>
        <li><strong>Professional portfolio</strong> showcase</li>
        <li><strong>Only £25/year</strong> - less than £2/month!</li>
      </ul>
    </div>

    <div class="cta">
      <a href="${data.signupUrl}" class="button">
        Complete Signup Now - Only £25/year
      </a>
    </div>

    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Questions? Just reply to this email.
    </p>

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

export const reservationUrgencyDay5Template = (data: {
  displayName: string;
  username: string;
  reservationExpiresAt: string;
  daysRemaining: number;
  signupUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⏰ Only ${data.daysRemaining} Days Left - Claim @${data.username}</title>
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
      border-top: 4px solid #dc2626;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #dc2626; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    .logo { 
      font-size: 24px; 
      font-weight: bold; 
      color: #f39c12; 
    }
    .urgency-icon {
      font-size: 56px;
      animation: pulse 2s infinite;
      margin: 20px 0;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .username-badge {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
    }
    .username-badge .username {
      font-size: 32px;
      font-weight: bold;
      font-family: monospace;
    }
    .username-badge .expiring {
      font-size: 14px;
      margin-top: 10px;
      opacity: 0.95;
    }
    .countdown {
      background: #fef2f2;
      border: 3px solid #dc2626;
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .countdown .days {
      font-size: 64px;
      font-weight: bold;
      color: #dc2626;
    }
    .countdown .label {
      color: #991b1b;
      font-size: 18px;
      font-weight: bold;
    }
    .warning-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #dc2626;
      color: white;
      padding: 18px 50px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 18px;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
    }
    .button:hover {
      background: #b91c1c;
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
      <div class="urgency-icon">⏰</div>
      <h1>Final Reminder: ${data.daysRemaining} Days Left!</h1>
    </div>

    <p>Hi ${data.displayName},</p>

    <p><strong>This is your final reminder</strong> - your reserved username expires in just <strong>${data.daysRemaining} days</strong>!</p>

    <div class="username-badge">
      <div class="username">@${data.username}</div>
      <div class="expiring">⚠️ Expires ${data.reservationExpiresAt}</div>
    </div>

    <div class="countdown">
      <div class="days">${data.daysRemaining}</div>
      <div class="label">DAYS LEFT TO CLAIM</div>
    </div>

    <div class="warning-box">
      <strong>⚠️ What happens after ${data.reservationExpiresAt}:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li><strong>@${data.username}</strong> becomes available for anyone to claim</li>
        <li>You'll lose your reserved spot</li>
        <li>Someone else could take your username</li>
      </ul>
    </div>

    <p style="font-size: 18px; text-align: center; margin: 30px 0;">
      <strong>Don't miss out on joining the VoiceoverStudioFinder community!</strong>
    </p>

    <p style="text-align: center;">
      Join hundreds of studios already connecting with voice artists worldwide.
    </p>

    <div class="cta">
      <a href="${data.signupUrl}" class="button">
        Claim @${data.username} Now - £25/year
      </a>
    </div>

    <p style="text-align: center; color: #dc2626; font-weight: bold;">
      Act now - only ${data.daysRemaining} days remaining!
    </p>

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

export const reservationExpiredTemplate = (data: {
  displayName: string;
  username: string;
  signupUrl: string;
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your @${data.username} Reservation Has Expired</title>
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
      border-bottom: 2px solid #6b7280; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    .logo { 
      font-size: 24px; 
      font-weight: bold; 
      color: #f39c12; 
    }
    .expired-icon {
      font-size: 48px;
      color: #6b7280;
      margin: 20px 0;
    }
    .expired-box {
      background: #f3f4f6;
      border: 2px solid #9ca3af;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .expired-box .username {
      font-size: 28px;
      font-weight: bold;
      font-family: monospace;
      color: #4b5563;
      text-decoration: line-through;
    }
    .expired-box .status {
      color: #6b7280;
      font-size: 14px;
      margin-top: 10px;
    }
    .info-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 15px 40px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background: #2563eb;
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
      <div class="expired-icon">⌛</div>
      <h1>Reservation Expired</h1>
    </div>

    <p>Hi ${data.displayName},</p>

    <p>Your username reservation has expired and is now available for others to claim.</p>

    <div class="expired-box">
      <div class="username">@${data.username}</div>
      <div class="status">Reservation expired</div>
    </div>

    <div class="info-box">
      <strong>What this means:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>The username <strong>@${data.username}</strong> is no longer reserved for you</li>
        <li>Another user may now claim this username</li>
        <li>Your account and signup data have been removed</li>
      </ul>
    </div>

    <p>If you'd still like to join VoiceoverStudioFinder, you can sign up again. The username <strong>@${data.username}</strong> may or may not still be available.</p>

    <p>We understand that timing doesn't always work out, and we'd love to have you join our community whenever you're ready!</p>

    <div class="cta">
      <a href="${data.signupUrl}" class="button">
        Sign Up Again
      </a>
    </div>

    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      Questions? Contact us at <a href="mailto:support@voiceoverstudiofinder.com">support@voiceoverstudiofinder.com</a>
    </p>

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


export interface PasswordResetEmailData {
  displayName: string;
  email: string;
  resetUrl: string;
}

export function getPasswordResetEmailTemplate(data: PasswordResetEmailData) {
  const { displayName, email, resetUrl } = data;

  return {
    subject: 'Reset Your VoiceoverStudioFinder Password',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: 'Raleway', Arial, sans-serif;
            line-height: 1.6;
            color: #27292b;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #5a4f66 0%, #666 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e0dce8;
            border-top: none;
        }
        .button {
            display: inline-block;
            background: #5a4f66;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background: #4a3f56;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            background: #f8f7fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #999;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e0dce8;
            border-top: none;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">VoiceoverStudioFinder</div>
        <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
        <h2>Hi ${displayName},</h2>
        
        <p>We received a request to reset the password for your VoiceoverStudioFinder account (${email}).</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #5a4f66;">${resetUrl}</p>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0 0 0;">
                <li>This password reset link will expire in 1 hour</li>
                <li>The link can only be used once</li>
                <li>If you didn't request this reset, please ignore this email</li>
            </ul>
        </div>
        
        <p>For your security, we recommend choosing a strong password that:</p>
        <ul>
            <li>Is at least 8 characters long</li>
            <li>Contains uppercase and lowercase letters</li>
            <li>Includes numbers and special characters</li>
            <li>Is unique to your VoiceoverStudioFinder account</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
        <p>© 2024 VoiceoverStudioFinder. All rights reserved.</p>
        <p>Need help? Contact us at <a href="mailto:support@voiceoverstudiofinder.com">support@voiceoverstudiofinder.com</a></p>
    </div>
</body>
</html>`,
    text: `
Password Reset Request - VoiceoverStudioFinder

Hi ${displayName},

We received a request to reset the password for your VoiceoverStudioFinder account (${email}).

To reset your password, click the following link:
${resetUrl}

SECURITY NOTICE:
- This password reset link will expire in 1 hour
- The link can only be used once  
- If you didn't request this reset, please ignore this email

For your security, we recommend choosing a strong password that:
- Is at least 8 characters long
- Contains uppercase and lowercase letters
- Includes numbers and special characters
- Is unique to your VoiceoverStudioFinder account

If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.

Need help? Contact us at support@voiceoverstudiofinder.com

© 2024 VoiceoverStudioFinder. All rights reserved.
`,
  };
}

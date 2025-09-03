export interface WelcomeEmailData {
  displayName: string;
  email: string;
  verificationUrl: string;
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData) {
  const { displayName, email, verificationUrl } = data;

  return {
    subject: 'Welcome to VoiceoverStudioFinder - Verify Your Email',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to VoiceoverStudioFinder</title>
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
        <h1>Welcome ${displayName}!</h1>
    </div>
    
    <div class="content">
        <h2>Thank you for joining our community!</h2>
        
        <p>We're excited to have you on board. VoiceoverStudioFinder connects voice professionals with recording studios worldwide.</p>
        
        <p>To get started, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        
        <p>Once verified, you'll be able to:</p>
        <ul>
            <li>Browse and search professional recording studios</li>
            <li>Connect with studio owners and voice professionals</li>
            <li>Manage your profile and preferences</li>
            <li>Join our vibrant community</li>
        </ul>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #5a4f66;">${verificationUrl}</p>
        
        <p>This verification link will expire in 24 hours for security reasons.</p>
    </div>
    
    <div class="footer">
        <p>If you didn't create an account with us, please ignore this email.</p>
        <p>© 2024 VoiceoverStudioFinder. All rights reserved.</p>
        <p>Need help? Contact us at <a href="mailto:support@voiceoverstudiofinder.com">support@voiceoverstudiofinder.com</a></p>
    </div>
</body>
</html>`,
    text: `
Welcome to VoiceoverStudioFinder, ${displayName}!

Thank you for joining our community of voice professionals and recording studios.

To complete your registration, please verify your email address by clicking the following link:
${verificationUrl}

This verification link will expire in 24 hours for security reasons.

Once verified, you'll be able to:
- Browse and search professional recording studios
- Connect with studio owners and voice professionals  
- Manage your profile and preferences
- Join our vibrant community

If you didn't create an account with us, please ignore this email.

Need help? Contact us at support@voiceoverstudiofinder.com

© 2024 VoiceoverStudioFinder. All rights reserved.
`,
  };
}

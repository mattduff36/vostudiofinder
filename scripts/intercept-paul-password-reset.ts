/**
 * Intercept Password Reset for Paul
 * 
 * Generates a legitimate password reset token for paul@voiceoverpaul.co.uk
 * but sends the email to admin@mpdee.co.uk for manual forwarding.
 * 
 * This allows the admin to receive Paul's password reset link and forward it to him.
 */

import { db } from '../src/lib/db';
import { generateResetToken } from '../src/lib/auth-utils';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function interceptPasswordReset() {
  try {
    const paulEmail = 'paul@voiceoverpaul.co.uk';
    const interceptRecipient = 'guy@voiceoverguy.co.uk'; // Changed from admin@mpdee.co.uk due to DNS issues
    
    console.log('🔐 Intercepting password reset for Paul...');
    console.log(`📧 Paul's email: ${paulEmail}`);
    console.log(`📬 Sending to: ${interceptRecipient} (admin email has DNS issues)\n`);
    
    // Find Paul's user account
    const user = await db.users.findUnique({
      where: { email: paulEmail },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
      },
    });
    
    if (!user) {
      console.error(`❌ User not found: ${paulEmail}`);
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);
    
    // Generate reset token
    const resetToken = await generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    // Save reset token to database
    await db.users.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        updated_at: new Date(),
      },
    });
    
    console.log('✅ Reset token generated and saved to database');
    console.log(`⏰ Token expires at: ${resetTokenExpiry.toLocaleString()}`);
    
    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://voiceoverstudiofinder.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    console.log(`🔗 Reset URL: ${resetUrl}\n`);
    
    // Generate email HTML and text
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset for Paul</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #d42027; margin: 0; font-size: 28px; font-weight: 700;">
        Voiceover Studio Finder
      </h1>
    </div>
    
    <!-- Alert Box -->
    <div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <h2 style="color: #856404; margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">
        ⚠️ INTERCEPTED PASSWORD RESET
      </h2>
      <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
        This email is for <strong>paul@voiceoverpaul.co.uk</strong><br>
        Please forward this entire email to Paul manually.
      </p>
    </div>
    
    <!-- Main Content -->
    <div style="margin-bottom: 30px;">
      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        Reset Your Password
      </h2>
      
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi Paul,
      </p>
      
      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We received a request to reset the password for <strong>${user.email}</strong>. 
        Click the button below to set a new password.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; background-color: #d42027; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      
      <div style="background-color: #f5f5f5; border-radius: 4px; padding: 12px; margin: 0 0 20px 0; word-break: break-all;">
        <code style="color: #d42027; font-size: 13px;">${resetUrl}</code>
      </div>
      
      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, 
        you can ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 40px;">
      <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
        This email was sent by Voiceover Studio Finder<br>
        <a href="https://voiceoverstudiofinder.com" style="color: #d42027; text-decoration: none;">
          voiceoverstudiofinder.com
        </a>
      </p>
    </div>
    
  </div>
</body>
</html>
`;
    
    const text = `
INTERCEPTED PASSWORD RESET
This email is for paul@voiceoverpaul.co.uk
Please forward this entire email to Paul manually.

========================================

Reset Your Password

Hi Paul,

We received a request to reset the password for ${user.email}. 
Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.

========================================

Voiceover Studio Finder
https://voiceoverstudiofinder.com
`;
    
    // Determine sender email
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
    
    console.log('📧 Sending intercepted email...');
    console.log(`📤 From: ${fromEmail}\n`);
    
    // Send email via Resend
    const result = await resend.emails.send({
      from: fromEmail,
      to: interceptRecipient, // Send to admin, not Paul
      subject: `Password Reset Link for Paul Berry (@${user.username})`,
      html,
      text,
    });
    
    if (result.error) {
      console.error('❌ Failed to send email:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Email sent successfully via Resend!');
    console.log(`📬 Email ID: ${result.data?.id}`);
    console.log(`📧 Sent to: ${interceptRecipient}\n`);
    
    console.log('=' .repeat(80));
    console.log('✅ SUCCESS!');
    console.log('=' .repeat(80));
    console.log(`📧 Check ${interceptRecipient} for the password reset email`);
    console.log('📤 Forward the entire email to paul@voiceoverpaul.co.uk');
    console.log('🔗 The reset link will work for Paul\'s account');
    console.log(`⏰ Link expires in 1 hour (${resetTokenExpiry.toLocaleString()})`);
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Error intercepting password reset:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
interceptPasswordReset();

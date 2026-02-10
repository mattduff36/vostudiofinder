/**
 * Manual Password Reset Email Script
 * 
 * Sends a password reset email manually with CC recipients
 * Usage: npx tsx scripts/manual-password-reset.ts
 */

import { db } from '../src/lib/db';
import { generateResetToken } from '../src/lib/auth-utils';
import { generatePasswordResetEmail } from '../src/lib/email/templates/password-reset';
import { Resend } from 'resend';

async function sendManualPasswordReset() {
  const userEmail = 'paul@voiceoverpaul.co.uk';
  const testRecipient = 'admin@mpdee.co.uk'; // Send only to admin for testing
  
  try {
    console.log(`🔐 Starting manual password reset for: ${userEmail}`);
    console.log(`📧 Sending test email to: ${testRecipient}`);
    
    // Check if user exists
    const user = await db.users.findUnique({
      where: { email: userEmail.toLowerCase() },
    });
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.email} (ID: ${user.id})`);
    
    // Generate reset token
    const resetToken = await generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save reset token to database
    await db.users.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        updated_at: new Date(),
      },
    });
    
    console.log(`✅ Reset token generated and saved to database`);
    console.log(`⏰ Token expires at: ${resetTokenExpiry.toLocaleString()}`);
    
    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://voiceoverstudiofinder.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    console.log(`🔗 Reset URL: ${resetUrl}`);
    
    // Generate email HTML
    const { html, text } = generatePasswordResetEmail({
      resetUrl,
      userEmail: user.email,
    });
    
    // Initialize Resend
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is not set');
      process.exit(1);
    }
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
    
    // Send email to test recipient only
    const result = await resend.emails.send({
      from: fromEmail,
      to: testRecipient,
      subject: 'TEST: Reset Your Password - VoiceoverStudioFinder (for paul@voiceoverpaul.co.uk)',
      html,
      text,
    });
    
    if (result.error) {
      console.error('❌ Failed to send email via Resend:', result.error);
      process.exit(1);
    }
    
    console.log('✅ Email sent successfully via Resend!');
    console.log(`📬 Email ID: ${result.data?.id}`);
    console.log(`📧 Sent to: ${testRecipient}`);
    console.log('');
    console.log('⚠️  This is a TEST email for troubleshooting');
    console.log('⚠️  Reset link is for paul@voiceoverpaul.co.uk (do not use)');
    
  } catch (error) {
    console.error('❌ Error sending manual password reset:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
sendManualPasswordReset();

/**
 * Generate Password Reset Link for Paul
 * 
 * Generates a new reset token and outputs the link for manual sharing
 */

import { db } from '../src/lib/db';
import { generateResetToken } from '../src/lib/auth-utils';

async function generateResetLink() {
  try {
    const paulEmail = 'paul@voiceoverpaul.co.uk';
    
    console.log('🔐 Generating password reset link for Paul...\n');
    
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
    
    console.log(`✅ User: ${user.display_name} (@${user.username})`);
    console.log(`📧 Email: ${user.email}\n`);
    
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
    
    console.log('✅ Token generated and saved to database');
    console.log(`⏰ Expires: ${resetTokenExpiry.toLocaleString()}\n`);
    
    // Build reset URL
    const baseUrl = 'https://voiceoverstudiofinder.com';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    console.log('=' .repeat(80));
    console.log('🔗 PASSWORD RESET LINK:');
    console.log('=' .repeat(80));
    console.log(resetUrl);
    console.log('=' .repeat(80));
    console.log('');
    console.log('📤 Send this link to Paul Berry (paul@voiceoverpaul.co.uk)');
    console.log(`⏰ Link expires in 1 hour (${resetTokenExpiry.toLocaleString()})`);
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Error generating reset link:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
generateResetLink();

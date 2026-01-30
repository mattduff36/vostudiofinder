/**
 * Send Test Email Script
 * 
 * Quick script to send the legacy-user-announcement email template
 * to test the formatting fixes.
 */

import { generateLegacyUserAnnouncementEmail } from '../src/lib/email/templates/legacy-user-announcement';
import { sendEmail } from '../src/lib/email/email-service';

async function sendTestEmail() {
  const recipientEmail = 'admin@mpdee.co.uk';
  const displayName = 'Matt';

  console.log('📧 Sending test email to:', recipientEmail);
  console.log('📝 Template: legacy-user-announcement (with formatting fixes)');

  try {
    // Generate a dummy reset URL for testing
    const resetPasswordUrl = 'https://voiceoverstudiofinder.com/auth/reset-password?token=test_token_123';

    // Generate the email HTML
    const { subject, previewText, html, text } = generateLegacyUserAnnouncementEmail({
      userEmail: recipientEmail,
      displayName,
      resetPasswordUrl,
    });

    console.log('📋 Email details:');
    console.log('   Subject:', subject);
    console.log('   Preview:', previewText);
    console.log('   HTML length:', html.length, 'chars');

    // Send the email
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      from: 'Voiceover Studio Finder <support@voiceoverstudiofinder.com>',
    });

    if (result) {
      console.log('✅ Test email sent successfully!');
      console.log('📬 Check your inbox at:', recipientEmail);
      console.log('');
      console.log('🔍 What to check:');
      console.log('   1. Mobile view: No white space on right side');
      console.log('   2. Desktop view: Header image has correct aspect ratio (not stretched)');
      console.log('   3. Image displays properly across devices');
    } else {
      console.error('❌ Failed to send test email');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    process.exit(1);
  }
}

sendTestEmail();

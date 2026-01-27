/**
 * Test script to send verification request email to admin@mpdee.co.uk for review
 * 
 * Usage: npx tsx scripts/test-verification-email.ts
 */

import { sendEmail } from '../src/lib/email/email-service';
import { generateVerificationRequestEmail } from '../src/lib/email/templates/verification-request';

async function testVerificationEmail() {
  console.log('🧪 Testing verification request email template...\n');

  // Sample data for testing
  const testData = {
    studioOwnerName: 'John Smith',
    studioName: 'Premium Voice Studio',
    username: 'johnsmith',
    email: 'john@example.com',
    profileCompletion: 92,
    studioUrl: 'https://voiceoverstudiofinder.com/johnsmith',
    adminDashboardUrl: 'https://voiceoverstudiofinder.com/admin',
  };

  console.log('📧 Generating email with test data:');
  console.log(`   Studio: ${testData.studioName}`);
  console.log(`   Owner: ${testData.studioOwnerName} (@${testData.username})`);
  console.log(`   Completion: ${testData.profileCompletion}%\n`);

  const { html, text, subject } = generateVerificationRequestEmail(testData);

  console.log(`📬 Subject: ${subject}\n`);
  console.log('📨 Sending email to admin@mpdee.co.uk for review...\n');

  try {
    const success = await sendEmail({
      to: 'admin@mpdee.co.uk',
      subject: `[TEST] ${subject}`,
      html,
      text,
      replyTo: testData.email,
    });

    if (success) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check admin@mpdee.co.uk inbox for the test email.\n');
    } else {
      console.error('❌ Failed to send email');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

// Run the test
testVerificationEmail()
  .then(() => {
    console.log('✨ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });

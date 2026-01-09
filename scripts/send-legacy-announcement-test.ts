import * as dotenv from 'dotenv';
import { Resend } from 'resend';
import { 
  generateLegacyUserAnnouncementEmail,
  generateLegacyUserResetUrl 
} from '../src/lib/email/templates/legacy-user-announcement';

// Load environment variables
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendLegacyAnnouncementTest() {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in environment');
    process.exit(1);
  }

  const testEmail = 'matt.mpdee@gmail.com';
  
  // Generate reset password URL with token
  console.log('🔐 Generating password reset token...');
  let resetPasswordUrl: string;
  try {
    resetPasswordUrl = await generateLegacyUserResetUrl(testEmail);
    console.log('✅ Reset token generated\n');
  } catch (error) {
    console.error('❌ Error generating reset token:', error instanceof Error ? error.message : error);
    console.error('💡 Make sure the user exists in the database before sending the email.');
    process.exit(1);
  }
  
  const { subject, previewText, html, text } = generateLegacyUserAnnouncementEmail({
    userEmail: testEmail,
    displayName: 'Matt',
    resetPasswordUrl,
  });

  console.log('📤 Sending legacy user announcement email...');
  console.log(`📧 Subject: ${subject}`);
  console.log(`👁️  Preview: ${previewText}\n`);
  
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error('❌ Failed to send email:', result.error);
      process.exit(1);
    }

    console.log('✅ Legacy announcement email sent successfully!');
    console.log('📧 Email ID:', result.data?.id);
    console.log('📬 Check your inbox at:', testEmail);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

sendLegacyAnnouncementTest();


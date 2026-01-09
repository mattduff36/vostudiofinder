import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import { generateLegacyUserAnnouncementEmail } from '../src/lib/email/templates/legacy-user-announcement';

// Load environment variables
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const REVIEW_EMAIL = 'matt.mpdee@gmail.com';

async function sendLegacyAnnouncementReview() {
  console.log('\n📧 Sending legacy user announcement template for review...\n');

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment');
    }

    // Use a dummy reset URL for testing (won't work, but shows the template)
    const dummyResetUrl = 'https://voiceoverstudiofinder.com/auth/reset-password?token=test-token-for-review';

    const { subject, previewText, html, text } = generateLegacyUserAnnouncementEmail({
      userEmail: REVIEW_EMAIL,
      displayName: 'Matt',
      resetPasswordUrl: dummyResetUrl,
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: REVIEW_EMAIL,
      subject: `[OUTLOOK FIX TEST] ${subject}`,
      html,
      text,
    });

    console.log('✅ Legacy announcement email sent successfully!');
    console.log(`📧 Subject: ${subject}`);
    console.log(`👁️  Preview: ${previewText}`);
    console.log(`📬 Check ${REVIEW_EMAIL} for the review email\n`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

sendLegacyAnnouncementReview();

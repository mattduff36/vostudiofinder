import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import { reservationReminderDay2Template } from '../src/lib/email/templates/username-reservation';

// Note: reservationReminderDay2Template is the "Complete your signup" template

// Load environment variables
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = 'matt.mpdee@gmail.com';

async function sendSingleTemplate() {
  console.log('\n📧 Sending "Complete your signup" template for review...\n');

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment');
    }

    const template = reservationReminderDay2Template({
      displayName: 'John Smith',
      username: 'johnsmith',
      reservationExpiresAt: '14 January 2026',
      daysRemaining: 5,
      signupUrl: 'https://voiceoverstudiofinder.com/signup?reservation=example',
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[CTA BUTTON FIX TEST] Complete your signup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template: Complete your signup</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code></p>
            <p><strong>Function:</strong> <code>reservationReminderDay2Template</code></p>
            <p><strong>Subject:</strong> "Complete your signup"</p>
            <p><strong>Purpose:</strong> Remind user to complete signup with reserved username</p>
            <p><strong>Changes:</strong> Table-based button structure with VML for Outlook, removed color-scheme dark, added -webkit-text-fill-color</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #1a1a1a; margin-top: 0;">Email Preview:</h3>
            ${template}
          </div>
        </div>
      `,
      text: `Complete your signup

You started signing up but didn't complete your payment. Your username @johnsmith is reserved until 14 January 2026.

Reserved username: @johnsmith
5 days remaining

Complete signup: https://voiceoverstudiofinder.com/signup?reservation=example

---
Voiceover Studio Finder
© ${new Date().getFullYear()} Voiceover Studio Finder. All rights reserved.
Questions? support@voiceoverstudiofinder.com
      `,
    });

    console.log('✅ Sent: Complete your signup template');
    console.log(`📬 Check ${ADMIN_EMAIL} for the review email\n`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

sendSingleTemplate();


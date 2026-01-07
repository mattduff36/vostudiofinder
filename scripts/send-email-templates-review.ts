import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import { generateEmailVerificationEmail } from '../src/lib/email/templates/email-verification';
import { generatePasswordResetEmail } from '../src/lib/email/templates/password-reset';
import { getWelcomeEmailTemplate } from '../src/lib/email/templates/welcome';
import { paymentSuccessTemplate, paymentFailedTemplate } from '../src/lib/email/templates/payment-success';
import {
  paymentFailedReservationTemplate,
  reservationReminderDay2Template,
  reservationUrgencyDay5Template,
  reservationExpiredTemplate,
} from '../src/lib/email/templates/username-reservation';

// Load environment variables
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = 'matt.mpdee@gmail.com';

// Helper function to add delay between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendAllEmailTemplates() {
  console.log('\n📧 Sending all redesigned email templates to', ADMIN_EMAIL, '\n');
  console.log('⏱️  Adding 2-second delays between emails to avoid rate limiting...\n');

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment');
    }

    // Email 1: Email Verification
    console.log('📤 Sending: Email Verification Template...');
    const emailVerification = generateEmailVerificationEmail({
      verificationUrl: 'https://voiceoverstudiofinder.com/auth/verify-email?token=example-token',
      userEmail: 'example@example.com',
      displayName: 'John Smith',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 1/9] Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 1: Email Verification</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/email-verification.ts</code></p>
            <p><strong>Subject:</strong> "Verify your email address"</p>
            <p><strong>Purpose:</strong> Verify user email address during account creation</p>
            <p><strong>Expires:</strong> 24 hours</p>
          </div>
          ${emailVerification.html}
        </div>
      `,
    });
    console.log('✅ Sent: Email Verification Template\n');
    await delay(2000);

    // Email 2: Password Reset
    console.log('📤 Sending: Password Reset Template...');
    const passwordReset = generatePasswordResetEmail({
      resetUrl: 'https://voiceoverstudiofinder.com/auth/reset-password?token=example-token',
      userEmail: 'example@example.com',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 2/9] Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 2: Password Reset</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/password-reset.ts</code></p>
            <p><strong>Subject:</strong> "Reset your password"</p>
            <p><strong>Purpose:</strong> Allow users to reset their password</p>
            <p><strong>Expires:</strong> 1 hour</p>
          </div>
          ${passwordReset.html}
        </div>
      `,
    });
    console.log('✅ Sent: Password Reset Template\n');
    await delay(2000);

    // Email 3: Welcome Email
    console.log('📤 Sending: Welcome Email Template...');
    const welcomeEmail = getWelcomeEmailTemplate({
      display_name: 'John Smith',
      email: 'example@example.com',
      verificationUrl: 'https://voiceoverstudiofinder.com/auth/verify-email?token=example-token',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 3/9] Welcome Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 3: Welcome Email</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/welcome.ts</code></p>
            <p><strong>Subject:</strong> "Welcome to VoiceoverStudioFinder"</p>
            <p><strong>Purpose:</strong> Welcome new users after account creation</p>
          </div>
          ${welcomeEmail.html}
        </div>
      `,
    });
    console.log('✅ Sent: Welcome Email Template\n');
    await delay(2000);

    // Email 4: Payment Success
    console.log('📤 Sending: Payment Success Template...');
    const paymentSuccess = paymentSuccessTemplate({
      customerName: 'John Smith',
      amount: '25.00',
      currency: 'gbp',
      invoiceNumber: 'INV-2026-001',
      planName: 'Annual Membership',
      nextBillingDate: '7 January 2027',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 4/9] Payment Success',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 4: Payment Success</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/payment-success.ts</code></p>
            <p><strong>Subject:</strong> "Payment received"</p>
            <p><strong>Purpose:</strong> Confirm successful payment processing</p>
          </div>
          ${paymentSuccess}
        </div>
      `,
    });
    console.log('✅ Sent: Payment Success Template\n');
    await delay(2000);

    // Email 5: Payment Failed
    console.log('📤 Sending: Payment Failed Template...');
    const paymentFailed = paymentFailedTemplate({
      customerName: 'John Smith',
      amount: '25.00',
      currency: 'gbp',
      reason: 'Your card was declined',
      retryDate: '10 January 2026',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 5/9] Payment Failed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 5: Payment Failed</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/payment-success.ts</code></p>
            <p><strong>Subject:</strong> "Payment failed"</p>
            <p><strong>Purpose:</strong> Notify users of payment failures</p>
          </div>
          ${paymentFailed}
        </div>
      `,
    });
    console.log('✅ Sent: Payment Failed Template\n');
    await delay(2000);

    // Email 6: Payment Failed with Reservation
    console.log('📤 Sending: Payment Failed (Reservation) Template...');
    const paymentFailedReservation = paymentFailedReservationTemplate({
      displayName: 'John Smith',
      username: 'johnsmith',
      amount: '25.00',
      currency: 'gbp',
      errorMessage: 'Your card was declined',
      reservationExpiresAt: '14 January 2026',
      retryUrl: 'https://voiceoverstudiofinder.com/upgrade?retry=true',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 6/9] Payment Failed (Username Reservation)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 6: Payment Failed (Username Reservation)</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code></p>
            <p><strong>Subject:</strong> "Payment issue with your signup"</p>
            <p><strong>Purpose:</strong> When payment fails during signup with username reservation</p>
          </div>
          ${paymentFailedReservation}
        </div>
      `,
    });
    console.log('✅ Sent: Payment Failed (Reservation) Template\n');
    await delay(2000);

    // Email 7: Reservation Reminder (Day 2)
    console.log('📤 Sending: Reservation Reminder Day 2 Template...');
    const reminderDay2 = reservationReminderDay2Template({
      displayName: 'John Smith',
      username: 'johnsmith',
      reservationExpiresAt: '14 January 2026',
      daysRemaining: 5,
      signupUrl: 'https://voiceoverstudiofinder.com/upgrade',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 7/9] Reservation Reminder Day 2',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 7: Reservation Reminder (Day 2)</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code></p>
            <p><strong>Subject:</strong> "Complete your signup"</p>
            <p><strong>Purpose:</strong> Reminder 2 days after signup to complete payment</p>
            <p><strong>Trigger:</strong> Sent automatically 2 days after signup if payment not completed</p>
          </div>
          ${reminderDay2}
        </div>
      `,
    });
    console.log('✅ Sent: Reservation Reminder Day 2 Template\n');
    await delay(2000);

    // Email 8: Reservation Urgency (Day 5)
    console.log('📤 Sending: Reservation Urgency Day 5 Template...');
    const urgencyDay5 = reservationUrgencyDay5Template({
      displayName: 'John Smith',
      username: 'johnsmith',
      reservationExpiresAt: '14 January 2026',
      daysRemaining: 2,
      signupUrl: 'https://voiceoverstudiofinder.com/upgrade',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 8/9] Reservation Urgency Day 5',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 8: Reservation Urgency (Day 5)</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code></p>
            <p><strong>Subject:</strong> "Your username reservation expires in 2 days"</p>
            <p><strong>Purpose:</strong> Final reminder 5 days after signup (2 days before expiration)</p>
            <p><strong>Trigger:</strong> Sent automatically 5 days after signup if payment not completed</p>
          </div>
          ${urgencyDay5}
        </div>
      `,
    });
    console.log('✅ Sent: Reservation Urgency Day 5 Template\n');
    await delay(2000);

    // Email 9: Reservation Expired
    console.log('📤 Sending: Reservation Expired Template...');
    const reservationExpired = reservationExpiredTemplate({
      displayName: 'John Smith',
      username: 'johnsmith',
      signupUrl: 'https://voiceoverstudiofinder.com/signup',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATE 9/9] Reservation Expired',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">Template 9: Reservation Expired</h2>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code></p>
            <p><strong>Subject:</strong> "Your username reservation has expired"</p>
            <p><strong>Purpose:</strong> Notifying users their username reservation has expired</p>
            <p><strong>Trigger:</strong> Sent automatically when reservation expires (7 days after signup)</p>
          </div>
          ${reservationExpired}
        </div>
      `,
    });
    console.log('✅ Sent: Reservation Expired Template\n');
    await delay(2000);

    // Summary Email
    console.log('📤 Sending: Summary Email...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[REDESIGNED TEMPLATES] Summary - All 9 Email Templates',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <h1 style="color: #1a1a1a; margin-bottom: 24px;">Email Templates - Redesign Complete</h1>
            
            <p>All 9 email templates have been redesigned to enterprise SaaS standards and sent to your inbox for review.</p>
            
            <h2 style="color: #1a1a1a; margin-top: 32px; margin-bottom: 16px;">Design Changes</h2>
            <ul style="line-height: 1.8;">
              <li>Simple layout inspired by Google/Stripe emails</li>
              <li>Text-first design that works without images</li>
              <li>Mobile-first responsive layout</li>
              <li>Inline CSS only (email-client safe)</li>
              <li>Dark mode support via color-scheme meta tags</li>
            </ul>
            
            <h2 style="color: #1a1a1a; margin-top: 32px; margin-bottom: 16px;">Content Changes</h2>
            <ul style="line-height: 1.8;">
              <li>Neutral, confident tone throughout</li>
              <li>Short sentences with clear hierarchy</li>
              <li>One primary action per email</li>
              <li>No emojis or exclamation marks</li>
              <li>No marketing language in transactional emails</li>
              <li>UK spelling throughout</li>
              <li>Factual, concise subject lines</li>
            </ul>
            
            <h2 style="color: #1a1a1a; margin-top: 32px; margin-bottom: 16px;">Template Inventory</h2>
            
            <h3 style="color: #1a1a1a; margin-top: 24px; margin-bottom: 12px;">Authentication & Account Management (3 templates)</h3>
            <ol style="line-height: 1.8;">
              <li><strong>Email Verification</strong> - Verify user email address during account creation</li>
              <li><strong>Password Reset</strong> - Allow users to reset their password</li>
              <li><strong>Welcome Email</strong> - Welcome new users after account creation</li>
            </ol>
            
            <h3 style="color: #1a1a1a; margin-top: 24px; margin-bottom: 12px;">Payment & Subscription (2 templates)</h3>
            <ol start="4" style="line-height: 1.8;">
              <li><strong>Payment Success</strong> - Confirm successful payment processing</li>
              <li><strong>Payment Failed</strong> - Notify users of payment failures</li>
            </ol>
            
            <h3 style="color: #1a1a1a; margin-top: 24px; margin-bottom: 12px;">Username Reservation Campaign (4 templates)</h3>
            <ol start="6" style="line-height: 1.8;">
              <li><strong>Payment Failed (Reservation)</strong> - Payment failure during signup with username hold</li>
              <li><strong>Day 2 Reminder</strong> - Soft reminder to complete payment</li>
              <li><strong>Day 5 Urgency</strong> - Final reminder (2 days before expiration)</li>
              <li><strong>Reservation Expired</strong> - Username reservation has expired</li>
            </ol>
            
            <h2 style="color: #1a1a1a; margin-top: 32px; margin-bottom: 16px;">Review Checklist</h2>
            <ul style="line-height: 1.8;">
              <li>Check subject lines for clarity and accuracy</li>
              <li>Verify all CTAs (Call-to-Actions) are clear and functional</li>
              <li>Confirm branding consistency (tone, structure)</li>
              <li>Review timing of automated emails (Day 2, Day 5, expiration)</li>
              <li>Test mobile rendering</li>
              <li>Verify links and contact information</li>
              <li>Check dark mode compatibility</li>
            </ul>
            
            <h2 style="color: #1a1a1a; margin-top: 32px; margin-bottom: 16px;">Files Location</h2>
            <ul style="line-height: 1.8; font-family: monospace; font-size: 14px;">
              <li>src/lib/email/templates/email-verification.ts</li>
              <li>src/lib/email/templates/password-reset.ts</li>
              <li>src/lib/email/templates/welcome.ts</li>
              <li>src/lib/email/templates/payment-success.ts</li>
              <li>src/lib/email/templates/username-reservation.ts</li>
            </ul>
            
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
            
            <p style="text-align: center; color: #6a6a6a; font-size: 14px;">
              Need changes? Reply to this email with specific feedback for each template.
            </p>
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Summary Email\n');

    console.log('\n✅ All 9 redesigned email templates + summary sent successfully!');
    console.log(`📬 Check ${ADMIN_EMAIL} for the complete review package\n`);

  } catch (error) {
    console.error('\n❌ Error sending email templates:', error);
    throw error;
  }
}

// Run the script
sendAllEmailTemplates()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

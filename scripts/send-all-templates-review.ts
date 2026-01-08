import * as dotenv from 'dotenv';
import { Resend } from 'resend';
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendAllTemplates() {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in environment');
    process.exit(1);
  }

  const testEmail = 'matt.mpdee@gmail.com';
  const baseUrl = 'https://voiceoverstudiofinder.com';

  console.log('📤 Sending all cleaned email templates for review...\n');

  try {
    // 1. Email Verification
    console.log('📧 Sending: Email Verification Template...');
    const emailVerification = generateEmailVerificationEmail({
      verificationUrl: `${baseUrl}/auth/verify-email?token=test-token-123`,
      userEmail: testEmail,
      displayName: 'Matt',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 1/9 - Email Verification',
      html: emailVerification.html,
      text: emailVerification.text,
    });
    console.log('✅ Sent: Email Verification\n');
    await delay(1000);

    // 2. Password Reset
    console.log('📧 Sending: Password Reset Template...');
    const passwordReset = generatePasswordResetEmail({
      resetUrl: `${baseUrl}/auth/reset-password?token=test-token-123`,
      userEmail: testEmail,
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 2/9 - Password Reset',
      html: passwordReset.html,
      text: passwordReset.text,
    });
    console.log('✅ Sent: Password Reset\n');
    await delay(1000);

    // 3. Welcome Email
    console.log('📧 Sending: Welcome Email Template...');
    const welcome = getWelcomeEmailTemplate({
      display_name: 'Matt',
      email: testEmail,
      verificationUrl: `${baseUrl}/auth/verify-email?token=test-token-123`,
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 3/9 - Welcome Email',
      html: welcome.html,
      text: welcome.text,
    });
    console.log('✅ Sent: Welcome Email\n');
    await delay(1000);

    // 4. Payment Success
    console.log('📧 Sending: Payment Success Template...');
    const paymentSuccess = paymentSuccessTemplate({
      customerName: 'Matt',
      amount: '29.99',
      currency: 'GBP',
      invoiceNumber: 'INV-2024-001',
      planName: 'Premium Membership',
      nextBillingDate: '1 February 2024',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 4/9 - Payment Success',
      html: paymentSuccess,
    });
    console.log('✅ Sent: Payment Success\n');
    await delay(1000);

    // 5. Payment Failed
    console.log('📧 Sending: Payment Failed Template...');
    const paymentFailed = paymentFailedTemplate({
      customerName: 'Matt',
      amount: '29.99',
      currency: 'GBP',
      reason: 'Insufficient funds',
      retryDate: '15 January 2024',
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 5/9 - Payment Failed',
      html: paymentFailed,
    });
    console.log('✅ Sent: Payment Failed\n');
    await delay(1000);

    // 6. Payment Failed Reservation
    console.log('📧 Sending: Payment Failed Reservation Template...');
    const paymentFailedReservation = paymentFailedReservationTemplate({
      displayName: 'Matt',
      username: 'mattstudio',
      amount: '29.99',
      currency: 'GBP',
      errorMessage: 'Card declined',
      reservationExpiresAt: '20 January 2024',
      retryUrl: `${baseUrl}/auth/retry-payment?token=test-token-123`,
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 6/9 - Payment Failed (Reservation)',
      html: paymentFailedReservation,
    });
    console.log('✅ Sent: Payment Failed Reservation\n');
    await delay(1000);

    // 7. Day 2 Reminder
    console.log('📧 Sending: Day 2 Reminder Template...');
    const day2Reminder = reservationReminderDay2Template({
      displayName: 'Matt',
      username: 'mattstudio',
      reservationExpiresAt: '20 January 2024',
      daysRemaining: 5,
      signupUrl: `${baseUrl}/auth/username-selection?token=test-token-123`,
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 7/9 - Day 2 Reminder',
      html: day2Reminder,
    });
    console.log('✅ Sent: Day 2 Reminder\n');
    await delay(1000);

    // 8. Day 5 Urgency
    console.log('📧 Sending: Day 5 Urgency Template...');
    const day5Urgency = reservationUrgencyDay5Template({
      displayName: 'Matt',
      username: 'mattstudio',
      reservationExpiresAt: '20 January 2024',
      daysRemaining: 2,
      signupUrl: `${baseUrl}/auth/username-selection?token=test-token-123`,
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 8/9 - Day 5 Urgency',
      html: day5Urgency,
    });
    console.log('✅ Sent: Day 5 Urgency\n');
    await delay(1000);

    // 9. Reservation Expired
    console.log('📧 Sending: Reservation Expired Template...');
    const reservationExpired = reservationExpiredTemplate({
      displayName: 'Matt',
      username: 'mattstudio',
      signupUrl: `${baseUrl}/auth/signup`,
    });
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: testEmail,
      subject: '[REVIEW] 9/9 - Reservation Expired',
      html: reservationExpired,
    });
    console.log('✅ Sent: Reservation Expired\n');

    console.log('\n✅ All 9 templates sent successfully!');
    console.log(`📬 Check your inbox at: ${testEmail}`);
    console.log('\n📋 Template Summary:');
    console.log('   1. Email Verification');
    console.log('   2. Password Reset');
    console.log('   3. Welcome Email');
    console.log('   4. Payment Success');
    console.log('   5. Payment Failed');
    console.log('   6. Payment Failed (Reservation)');
    console.log('   7. Day 2 Reminder');
    console.log('   8. Day 5 Urgency');
    console.log('   9. Reservation Expired');
  } catch (error) {
    console.error('❌ Error sending emails:', error);
    process.exit(1);
  }
}

sendAllTemplates();


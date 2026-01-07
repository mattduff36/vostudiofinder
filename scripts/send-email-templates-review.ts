import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = 'matt.mpdee@gmail.com';

// Helper function to add delay between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendAllEmailTemplates() {
  console.log('\n📧 Sending all email templates to', ADMIN_EMAIL, '\n');
  console.log('⏱️  Adding 2-second delays between emails to avoid rate limiting...\n');

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment');
    }

    // Email 1: Email Verification
    console.log('📤 Sending: Email Verification Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 1/9] Email Verification Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 1: Email Verification</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/email-verification.ts</code></p>
            <p><strong>Used For:</strong> New user sign-ups when they need to verify their email address</p>
            <p><strong>Subject Line:</strong> "Verify Your Email - VoiceoverStudioFinder"</p>
            <p><strong>Expires:</strong> 24 hours</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generateEmailVerificationPreview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Email Verification Template\n');
    await delay(2000);

    // Email 2: Password Reset
    console.log('📤 Sending: Password Reset Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 2/9] Password Reset Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 2: Password Reset</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/password-reset.ts</code></p>
            <p><strong>Used For:</strong> When users request to reset their password</p>
            <p><strong>Subject Line:</strong> "Reset Your Password - VoiceoverStudioFinder"</p>
            <p><strong>Expires:</strong> 1 hour</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generatePasswordResetPreview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Password Reset Template\n');
    await delay(2000);

    // Email 3: Welcome Email
    console.log('📤 Sending: Welcome Email Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 3/9] Welcome Email Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 3: Welcome Email</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/welcome.ts</code></p>
            <p><strong>Used For:</strong> Alternative welcome email (different style from verification)</p>
            <p><strong>Subject Line:</strong> "Welcome to VoiceoverStudioFinder - Verify Your Email"</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generateWelcomeEmailPreview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Welcome Email Template\n');
    await delay(2000);

    // Email 4: Payment Success
    console.log('📤 Sending: Payment Success Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 4/9] Payment Success Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 4: Payment Success</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/payment-success.ts</code></p>
            <p><strong>Used For:</strong> Confirming successful membership payment</p>
            <p><strong>Subject Line:</strong> "Payment Successful!"</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generatePaymentSuccessPreview()}
          </div>
        </div>
      `,
    });

    // Email 5: Payment Failed (General)
    console.log('📤 Sending: Payment Failed Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 5/9] Payment Failed Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 5: Payment Failed</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/payment-success.ts</code> (paymentFailedTemplate)</p>
            <p><strong>Used For:</strong> Notifying users of payment failures</p>
            <p><strong>Subject Line:</strong> "Payment Failed"</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generatePaymentFailedPreview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Payment Failed Template\n');
    await delay(2000);

    // Email 6: Payment Failed with Reservation
    console.log('📤 Sending: Payment Failed (Reservation) Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 6/9] Payment Failed (Username Reservation) Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 6: Payment Failed (Username Reservation)</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code> (paymentFailedReservationTemplate)</p>
            <p><strong>Used For:</strong> When payment fails during signup with username reservation</p>
            <p><strong>Subject Line:</strong> "Payment Issue - Complete Your Signup to Claim @username"</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generatePaymentFailedReservationPreview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Payment Failed (Reservation) Template\n');
    await delay(2000);

    // Email 7: Reservation Reminder (Day 2)
    console.log('📤 Sending: Reservation Reminder Day 2 Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 7/9] Reservation Reminder Day 2 Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 7: Reservation Reminder (Day 2)</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code> (reservationReminderDay2Template)</p>
            <p><strong>Used For:</strong> Reminder 2 days after signup to complete payment</p>
            <p><strong>Subject Line:</strong> "Complete Your Signup - @username is Reserved for You"</p>
            <p><strong>Trigger:</strong> Sent automatically 2 days after signup if payment not completed</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generateReservationReminderDay2Preview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Reservation Reminder Day 2 Template\n');
    await delay(2000);

    // Email 8: Reservation Urgency (Day 5)
    console.log('📤 Sending: Reservation Urgency Day 5 Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 8/9] Reservation Urgency Day 5 Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 8: Reservation Urgency (Day 5)</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code> (reservationUrgencyDay5Template)</p>
            <p><strong>Used For:</strong> Final reminder 5 days after signup (2 days before expiration)</p>
            <p><strong>Subject Line:</strong> "⏰ Only 2 Days Left to Claim @username"</p>
            <p><strong>Trigger:</strong> Sent automatically 5 days after signup if payment not completed</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generateReservationUrgencyDay5Preview()}
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Reservation Urgency Day 5 Template\n');
    await delay(2000);

    // Email 9: Reservation Expired
    console.log('📤 Sending: Reservation Expired Template...');
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
      to: ADMIN_EMAIL,
      subject: '[TEMPLATE REVIEW 9/9] Reservation Expired Template',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #d42027; border-bottom: 3px solid #d42027; padding-bottom: 10px;">Template 9: Reservation Expired</h1>
            <p><strong>File:</strong> <code>src/lib/email/templates/username-reservation.ts</code> (reservationExpiredTemplate)</p>
            <p><strong>Used For:</strong> Notifying users their username reservation has expired</p>
            <p><strong>Subject Line:</strong> "Your @username Reservation Has Expired"</p>
            <p><strong>Trigger:</strong> Sent automatically when reservation expires (7 days after signup)</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #d42027;">Live Preview:</h2>
            <hr>
            ${generateReservationExpiredPreview()}
          </div>
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
      subject: '[TEMPLATE REVIEW] 📋 Summary - All 9 Email Templates',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px;">
            <h1 style="color: #d42027;">📧 VoiceoverStudioFinder - Email Templates Summary</h1>
            
            <p>All 9 email templates have been sent to your inbox for review. Below is a complete inventory:</p>
            
            <h2 style="color: #d42027; margin-top: 30px;">📨 Authentication & Account Management (3 templates)</h2>
            <ol>
              <li><strong>Email Verification</strong> - New user email verification (24hr expiry)</li>
              <li><strong>Password Reset</strong> - Password reset requests (1hr expiry)</li>
              <li><strong>Welcome Email</strong> - Alternative welcome message</li>
            </ol>
            
            <h2 style="color: #d42027; margin-top: 30px;">💳 Payment & Subscription (2 templates)</h2>
            <ol start="4">
              <li><strong>Payment Success</strong> - Successful payment confirmation</li>
              <li><strong>Payment Failed</strong> - Payment failure notification</li>
            </ol>
            
            <h2 style="color: #d42027; margin-top: 30px;">🎯 Username Reservation Campaign (4 templates)</h2>
            <ol start="6">
              <li><strong>Payment Failed (Reservation)</strong> - Payment failure during signup with username hold</li>
              <li><strong>Day 2 Reminder</strong> - Soft reminder to complete payment</li>
              <li><strong>Day 5 Urgency</strong> - Urgent final reminder (2 days left)</li>
              <li><strong>Reservation Expired</strong> - Username reservation has expired</li>
            </ol>
            
            <h2 style="color: #d42027; margin-top: 30px;">📝 Review Checklist</h2>
            <ul>
              <li>✅ Check subject lines for clarity and urgency</li>
              <li>✅ Verify all CTAs (Call-to-Actions) are clear</li>
              <li>✅ Confirm branding consistency (colors, logo, tone)</li>
              <li>✅ Review timing of automated emails (Day 2, Day 5, expiration)</li>
              <li>✅ Check mobile responsiveness</li>
              <li>✅ Verify links and contact information</li>
              <li>✅ Ensure error messages are user-friendly</li>
            </ul>
            
            <h2 style="color: #d42027; margin-top: 30px;">🔧 Files Location</h2>
            <ul>
              <li><code>src/lib/email/templates/email-verification.ts</code></li>
              <li><code>src/lib/email/templates/password-reset.ts</code></li>
              <li><code>src/lib/email/templates/welcome.ts</code></li>
              <li><code>src/lib/email/templates/payment-success.ts</code></li>
              <li><code>src/lib/email/templates/username-reservation.ts</code></li>
            </ul>
            
            <p style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <strong>💡 Note:</strong> There's also a Support Ticket Reply template inline in <code>src/app/api/admin/support-tickets/[id]/reply/route.ts</code> that should be extracted to a proper template file for consistency.
            </p>
            
            <hr style="margin: 30px 0;">
            
            <p style="text-align: center; color: #6b7280;">
              Need changes? Reply to this email with specific feedback for each template.
            </p>
          </div>
        </div>
      `,
    });
    console.log('✅ Sent: Summary Email\n');

    console.log('\n✅ All 9 email templates + summary sent successfully!');
    console.log(`📬 Check ${ADMIN_EMAIL} for the complete review package\n`);

  } catch (error) {
    console.error('\n❌ Error sending email templates:', error);
    throw error;
  }
}

// Preview generators
function generateEmailVerificationPreview() {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #ffffff; padding: 30px 20px 20px 20px; text-align: center; border-bottom: 3px solid #d42027;">
          <img src="https://voiceoverstudiofinder.com/images/voiceover-studio-finder-header-logo2-black.png" alt="VoiceoverStudioFinder" style="max-width: 300px; height: auto;" />
        </div>
        <div style="padding: 40px 30px; background-color: #ffffff;">
          <h1 style="color: #1f2937; font-size: 26px; margin: 0 0 20px 0; font-weight: 600;">Welcome to VoiceoverStudioFinder!</h1>
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 16px 0;">Hello John Smith,</p>
          <p style="color: #4b5563; font-size: 16px;">Thank you for creating your studio profile. We're excited to have you join our community!</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="#" style="display: inline-block; padding: 16px 40px; background-color: #d42027; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify My Email</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">This link expires in 24 hours</p>
        </div>
      </div>
    </div>
  `;
}

function generatePasswordResetPreview() {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid #d42027;">
          <img src="https://voiceoverstudiofinder.com/images/voiceover-studio-finder-header-logo2-black.png" alt="Logo" style="max-width: 300px;" />
        </div>
        <div style="padding: 40px 30px;">
          <h1 style="color: #1f2937; font-size: 26px;">Reset Your Password</h1>
          <p style="color: #4b5563;">We received a request to reset your password.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="#" style="display: inline-block; padding: 16px 40px; background-color: #d42027; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset My Password</a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">This link expires in 1 hour</p>
        </div>
      </div>
    </div>
  `;
}

function generateWelcomeEmailPreview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #5a4f66 0%, #666 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">VoiceoverStudioFinder</div>
        <h1>Welcome John Smith!</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0dce8;">
        <h2>Thank you for joining our community!</h2>
        <p>We're excited to have you on board.</p>
        <div style="text-align: center;">
          <a href="#" style="display: inline-block; background: #5a4f66; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0;">Verify Email Address</a>
        </div>
      </div>
    </div>
  `;
}

function generatePaymentSuccessPreview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #f39c12; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f39c12;">VoiceoverStudioFinder</div>
        <div style="font-size: 48px; color: #27ae60; margin: 20px 0;">✅</div>
        <h1>Payment Successful!</h1>
      </div>
      <p>Hi John Smith,</p>
      <p>Thank you for your payment! We've successfully processed your subscription.</p>
      <div style="font-size: 32px; font-weight: bold; color: #27ae60; margin: 20px 0; text-align: center;">£25.00 GBP</div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background: #f39c12; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Your Dashboard</a>
      </div>
    </div>
  `;
}

function generatePaymentFailedPreview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #e74c3c; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f39c12;">VoiceoverStudioFinder</div>
        <div style="font-size: 48px; color: #e74c3c; margin: 20px 0;">❌</div>
        <h1>Payment Failed</h1>
      </div>
      <p>Hi John Smith,</p>
      <p>We were unable to process your payment for your subscription.</p>
      <div style="background: #fdf2f2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; color: #dc2626; margin: 20px 0;">
        <strong>Reason:</strong> Your card was declined
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Payment Method</a>
      </div>
    </div>
  `;
}

function generatePaymentFailedReservationPreview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #f39c12; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f39c12;">VoiceoverStudioFinder</div>
        <div style="font-size: 48px; color: #f39c12; margin: 20px 0;">⚠️</div>
        <h1>Payment Issue</h1>
      </div>
      <p>Hi John Smith,</p>
      <p>We tried to process your payment, but it didn't go through.</p>
      <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 24px; font-weight: bold; color: #b45309; font-family: monospace;">@johnsmith</div>
        <div style="color: #92400e; font-size: 14px; margin-top: 5px;">Reserved until Jan 14, 2026</div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background: #dc2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Retry Payment Now - £25 GBP</a>
      </div>
    </div>
  `;
}

function generateReservationReminderDay2Preview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #f39c12; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f39c12;">VoiceoverStudioFinder</div>
        <div style="font-size: 48px; margin: 20px 0;">⏰</div>
        <h1>Your Username is Waiting!</h1>
      </div>
      <p>Hi John Smith,</p>
      <p>You started signing up but didn't complete your payment.</p>
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 28px; font-weight: bold; font-family: monospace;">@johnsmith</div>
        <div style="font-size: 14px; margin-top: 5px;">✓ Reserved for you</div>
      </div>
      <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 48px; font-weight: bold; color: #b45309;">5</div>
        <div style="color: #92400e; font-size: 16px;">Days left to claim your username</div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background: #f39c12; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Complete Signup Now - Only £25/year</a>
      </div>
    </div>
  `;
}

function generateReservationUrgencyDay5Preview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; border-top: 4px solid #dc2626;">
      <div style="text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f39c12;">VoiceoverStudioFinder</div>
        <div style="font-size: 56px; margin: 20px 0;">⏰</div>
        <h1>Final Reminder: 2 Days Left!</h1>
      </div>
      <p>Hi John Smith,</p>
      <p><strong>This is your final reminder</strong> - your username expires in just <strong>2 days</strong>!</p>
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
        <div style="font-size: 32px; font-weight: bold; font-family: monospace;">@johnsmith</div>
        <div style="font-size: 14px; margin-top: 10px;">⚠️ Expires Jan 14, 2026</div>
      </div>
      <div style="background: #fef2f2; border: 3px solid #dc2626; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 64px; font-weight: bold; color: #dc2626;">2</div>
        <div style="color: #991b1b; font-size: 18px; font-weight: bold;">DAYS LEFT TO CLAIM</div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background: #dc2626; color: white; padding: 18px 50px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">Claim @johnsmith Now - £25/year</a>
      </div>
    </div>
  `;
}

function generateReservationExpiredPreview() {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #6b7280; padding-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold; color: #f39c12;">VoiceoverStudioFinder</div>
        <div style="font-size: 48px; color: #6b7280; margin: 20px 0;">⌛</div>
        <h1>Reservation Expired</h1>
      </div>
      <p>Hi John Smith,</p>
      <p>Your username reservation has expired and is now available for others to claim.</p>
      <div style="background: #f3f4f6; border: 2px solid #9ca3af; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <div style="font-size: 28px; font-weight: bold; font-family: monospace; color: #4b5563; text-decoration: line-through;">@johnsmith</div>
        <div style="color: #6b7280; font-size: 14px; margin-top: 10px;">Reservation expired</div>
      </div>
      <p>If you'd still like to join, you can sign up again. The username may or may not still be available.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Sign Up Again</a>
      </div>
    </div>
  `;
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


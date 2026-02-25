// Email service for sending notifications and transactional emails
import { Resend } from 'resend';
import { generatePasswordResetEmail } from './templates/password-reset';
import { generateEmailVerificationEmail } from './templates/email-verification';

// Lazy-initialize Resend client to ensure environment variables are loaded
let resend: Resend | null = null;
function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');
  }
  return resend;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text version for better deliverability
  from?: string;
  replyTo?: string; // Optional reply-to address for better UX
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Validate required environment variable
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable is not set');
    return false;
  }

  if (process.env.RESEND_API_KEY === 're_placeholder_key') {
    console.error('❌ RESEND_API_KEY is not configured properly');
    return false;
  }

  const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';

  console.log('📧 Sending email via Resend:', {
    to: options.to,
    subject: options.subject,
    from: fromEmail,
    htmlLength: options.html.length,
  });

  const emailPayload: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  } = {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  if (options.text) {
    emailPayload.text = options.text;
  }

  if (options.replyTo) {
    emailPayload.replyTo = options.replyTo;
  } else if (process.env.RESEND_REPLY_TO_EMAIL) {
    emailPayload.replyTo = process.env.RESEND_REPLY_TO_EMAIL;
  }

  const result = await getResendClient().emails.send(emailPayload);

  if (result.error) {
    const msg = result.error.message || JSON.stringify(result.error);
    console.error('❌ Failed to send email via Resend:', msg);
    throw new Error(`Resend API error: ${msg}`);
  }

  console.log('✅ Email sent successfully via Resend:', result.data?.id);
  return true;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const { html, text } = generatePasswordResetEmail({
    resetUrl,
    userEmail: to,
  });

  return sendEmail({
    to,
    subject: 'Reset Your Password - VoiceoverStudioFinder',
    html,
    text,
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  to: string,
  displayName: string,
  verificationUrl: string
): Promise<boolean> {
  const { html, text } = generateEmailVerificationEmail({
    verificationUrl,
    userEmail: to,
    displayName,
  });

  return sendEmail({
    to,
    subject: 'Verify Your Email - VoiceoverStudioFinder',
    html,
    text,
  });
}

export const emailService = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
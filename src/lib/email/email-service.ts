// Email service for sending notifications and transactional emails
import { Resend } from 'resend';
import { generatePasswordResetEmail } from './templates/password-reset';
import { generateEmailVerificationEmail } from './templates/email-verification';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Validate required environment variable
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is not set');
      return false;
    }

    // Additional check for placeholder key
    if (process.env.RESEND_API_KEY === 're_placeholder_key') {
      console.error('❌ RESEND_API_KEY is not configured properly');
      return false;
    }

    // Set default sender if not provided
    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
    
    console.log('📧 Sending email via Resend:', {
      to: options.to,
      subject: options.subject,
      from: fromEmail,
      htmlLength: options.html.length,
    });

    const result = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      console.error('❌ Failed to send email via Resend:', result.error);
      return false;
    }

    console.log('✅ Email sent successfully via Resend:', result.data?.id);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const html = generatePasswordResetEmail({
    resetUrl,
    userEmail: to,
  });

  return sendEmail({
    to,
    subject: 'Reset Your Password - VoiceoverStudioFinder',
    html,
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
  const html = generateEmailVerificationEmail({
    verificationUrl,
    userEmail: to,
    displayName,
  });

  return sendEmail({
    to,
    subject: 'Verify Your Email - VoiceoverStudioFinder',
    html,
  });
}

export const emailService = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
// Email service for sending notifications and transactional emails
import { Resend } from 'resend';
import { generatePasswordResetEmail } from './templates/password-reset';
import { generateEmailVerificationEmail } from './templates/email-verification';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text version for better deliverability
  from?: string;
  replyTo?: string; // Optional reply-to address for better UX
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const isMembershipConfirmedEmail = options.subject.includes('Membership Confirmed');

    // #region agent log
    if (isMembershipConfirmedEmail) fetch('http://127.0.0.1:7242/ingest/560a9e1e-7b53-4ba6-b284-58a46ea417c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D',location:'src/lib/email/email-service.ts:sendEmail:entry',message:'sendEmail called for Membership Confirmed',data:{hasResendApiKey:!!process.env.RESEND_API_KEY,isPlaceholderKey:process.env.RESEND_API_KEY==='re_placeholder_key',hasFromEnv:!!process.env.RESEND_FROM_EMAIL},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

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

    // Only include text if provided
    if (options.text) {
      emailPayload.text = options.text;
    }

    // Set reply-to if provided, or default to support email
    if (options.replyTo) {
      emailPayload.replyTo = options.replyTo;
    } else if (process.env.RESEND_REPLY_TO_EMAIL) {
      emailPayload.replyTo = process.env.RESEND_REPLY_TO_EMAIL;
    }

    const result = await resend.emails.send(emailPayload);

    if (result.error) {
      console.error('❌ Failed to send email via Resend:', result.error);
      // #region agent log
      if (isMembershipConfirmedEmail) fetch('http://127.0.0.1:7242/ingest/560a9e1e-7b53-4ba6-b284-58a46ea417c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D',location:'src/lib/email/email-service.ts:sendEmail:resend_error',message:'Resend returned error for Membership Confirmed',data:{hasError:true},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log
      return false;
    }

    console.log('✅ Email sent successfully via Resend:', result.data?.id);
    // #region agent log
    if (isMembershipConfirmedEmail) fetch('http://127.0.0.1:7242/ingest/560a9e1e-7b53-4ba6-b284-58a46ea417c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D',location:'src/lib/email/email-service.ts:sendEmail:success',message:'Resend sent Membership Confirmed',data:{hasDataId:!!result.data?.id},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // #region agent log
    // Avoid logging error details (may include provider info); only log that it threw.
    if (options.subject.includes('Membership Confirmed')) fetch('http://127.0.0.1:7242/ingest/560a9e1e-7b53-4ba6-b284-58a46ea417c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D',location:'src/lib/email/email-service.ts:sendEmail:throw',message:'sendEmail threw for Membership Confirmed',data:{threw:true,errorType:error instanceof Error?error.name:typeof error},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
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
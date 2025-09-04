// Email service for sending notifications and transactional emails
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Set default sender if not provided
    const fromEmail = options.from || 'noreply@voiceoverstudiofinder.com';
    
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

export const emailService = {
  sendEmail,
};
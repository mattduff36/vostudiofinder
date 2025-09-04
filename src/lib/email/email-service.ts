// Email service for sending notifications and transactional emails
// import { Resend } from 'resend'; // TEMPORARILY DISABLED

// const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key'); // TEMPORARILY DISABLED

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // TEMPORARILY DISABLED - Resend API is disabled
    console.log('📧 Email service is temporarily disabled:', {
      to: options.to,
      subject: options.subject,
      from: options.from || 'noreply@voiceoverstudiofinder.com',
      htmlLength: options.html.length,
    });
    
    console.log('⚠️ Resend API is temporarily disabled - email not sent');
    return false;

    // ORIGINAL CODE (commented out):
    /*
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
    */
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

export const emailService = {
  sendEmail,
};
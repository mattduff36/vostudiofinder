import { getWelcomeEmailTemplate, type WelcomeEmailData } from './templates/welcome';
import { getPasswordResetEmailTemplate, type PasswordResetEmailData } from './templates/password-reset';

// Email service interface - can be implemented with different providers
export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, text: string): Promise<void>;
}

// Resend email provider implementation
class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = 'noreply@voiceoverstudiofinder.com') {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!this.apiKey) {
      console.warn('Email sending disabled: RESEND_API_KEY not configured');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
      }

      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }
}

// Console email provider for development
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    console.log('📧 EMAIL SENT (Development Mode)');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text Content:');
    console.log(text);
    console.log('---');
  }
}

// Email service singleton
class EmailService {
  private provider: EmailProvider;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (process.env.NODE_ENV === 'development' || !apiKey) {
      this.provider = new ConsoleEmailProvider();
    } else {
      this.provider = new ResendEmailProvider(apiKey);
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const template = getWelcomeEmailTemplate(data);
    await this.provider.sendEmail(
      data.email,
      template.subject,
      template.html,
      template.text
    );
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const template = getPasswordResetEmailTemplate(data);
    await this.provider.sendEmail(
      data.email,
      template.subject,
      template.html,
      template.text
    );
  }

  async sendCustomEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    await this.provider.sendEmail(to, subject, html, text || '');
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export type { WelcomeEmailData, PasswordResetEmailData };

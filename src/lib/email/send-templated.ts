/**
 * Send Templated Email
 * 
 * High-level wrapper that:
 * 1. Renders template with variables
 * 2. Handles marketing opt-in enforcement
 * 3. Generates unsubscribe tokens
 * 4. Sends via email service
 */

import { sendEmail, type EmailOptions } from './email-service';
import { renderEmailTemplate } from './render';
import { db } from '@/lib/db';
import { getTemplateDefinition } from './template-registry';
import { generateUnsubscribeToken } from './unsubscribe-token';

export interface SendTemplatedEmailOptions {
  to: string;
  templateKey: string;
  variables: Record<string, any>;
  fromOverride?: string; // Optional sender override
  replyToOverride?: string; // Optional reply-to override
  skipMarketingCheck?: boolean; // For system emails, skip opt-in check
}

/**
 * Send an email using a template from the registry
 */
export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions
): Promise<boolean> {
  const { to, templateKey, variables, fromOverride, replyToOverride, skipMarketingCheck } = options;
  
  // Get template definition to check if it's marketing
  const templateDef = getTemplateDefinition(templateKey);
  const isMarketing = templateDef?.isMarketing || false;
  
  // For marketing emails, check opt-in (unless explicitly skipped)
  if (isMarketing && !skipMarketingCheck) {
    // Find user by email
    const user = await db.users.findUnique({
      where: { email: to.toLowerCase() },
      select: {
        id: true,
        email_preferences: {
          select: {
            marketing_opt_in: true,
            unsubscribed_at: true,
          },
        },
      },
    });
    
    // If user exists and has opted out, don't send
    if (user) {
      const prefs = user.email_preferences;
      if (prefs && (!prefs.marketing_opt_in || prefs.unsubscribed_at)) {
        console.log(`📧 Skipping marketing email to ${to} (opted out)`);
        return false;
      }
    }
  }
  
  // Generate unsubscribe token and URL for marketing emails
  let unsubscribeUrl: string | undefined;
  if (isMarketing) {
    try {
      const user = await db.users.findUnique({
        where: { email: to.toLowerCase() },
        select: { id: true },
      });
      
      if (user) {
        const token = await generateUnsubscribeToken(user.id);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://voiceoverstudiofinder.com';
        unsubscribeUrl = `${baseUrl}/email/unsubscribe?token=${token}`;
      }
    } catch (error) {
      console.error('Failed to generate unsubscribe token:', error);
      // Continue without unsubscribe link rather than failing
    }
  }
  
  // Render the template
  const rendered = await renderEmailTemplate(templateKey, variables, {
    includeUnsubscribe: isMarketing,
    unsubscribeUrl,
  });
  
  // Determine sender
  const fromEmail = fromOverride || rendered.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com';
  const replyTo = replyToOverride || rendered.replyToEmail || process.env.RESEND_REPLY_TO_EMAIL;
  
  // Construct full "From" header with name if provided
  const fromHeader = rendered.fromName 
    ? `${rendered.fromName} <${fromEmail}>`
    : fromEmail;
  
  // Send email
  const emailOptions: EmailOptions = {
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: fromHeader,
    replyTo,
  };
  
  return sendEmail(emailOptions);
}

/**
 * Send templated email to multiple recipients (batch)
 * Returns count of successful sends
 */
export async function sendTemplatedEmailBatch(
  recipients: string[],
  templateKey: string,
  variables: Record<string, any>,
  options: {
    fromOverride?: string;
    replyToOverride?: string;
    skipMarketingCheck?: boolean;
  } = {}
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const recipient of recipients) {
    try {
      const success = await sendTemplatedEmail({
        to: recipient,
        templateKey,
        variables,
        ...options,
      });
      
      if (success) {
        sent++;
      } else {
        failed++;
        errors.push(`${recipient}: Send returned false`);
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${recipient}: ${errorMsg}`);
      console.error(`Failed to send to ${recipient}:`, error);
    }
  }
  
  return { sent, failed, errors };
}

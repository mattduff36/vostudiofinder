/**
 * Email Template Renderer
 * 
 * Loads template from DB, validates placeholders, substitutes variables,
 * and renders using the appropriate locked layout.
 */

import { db } from '@/lib/db';
import { renderStandardLayout, type StandardLayoutProps } from './layouts/standard';
import { renderHeroLayout, type HeroLayoutProps } from './layouts/hero';
import { getTemplateDefinition } from './template-registry';
import type { EmailLayout } from '@prisma/client';

export interface RenderOptions {
  includeUnsubscribe?: boolean; // Add unsubscribe footer (for marketing emails)
  unsubscribeUrl?: string;
}

/**
 * Substitute {{placeholder}} variables in text
 */
function substituteVariables(text: string, variables: Record<string, any>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = variables[key.trim()];
    return value !== undefined && value !== null ? String(value) : match;
  });
}

/**
 * Validate that all required variables are provided
 */
function validateVariables(
  templateKey: string,
  variables: Record<string, any>,
  variableSchema: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const [key, type] of Object.entries(variableSchema)) {
    if (!(key in variables) || variables[key] === undefined || variables[key] === null) {
      missing.push(key);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Load template from database (or fall back to default)
 */
async function loadTemplate(templateKey: string) {
  // Try to load from DB first
  const dbTemplate = await db.email_templates.findUnique({
    where: { key: templateKey },
  });
  
  if (dbTemplate) {
    return {
      layout: dbTemplate.layout,
      subject: dbTemplate.subject,
      preheader: dbTemplate.preheader,
      heading: dbTemplate.heading,
      bodyParagraphs: dbTemplate.body_paragraphs,
      bulletItems: dbTemplate.bullet_items,
      ctaPrimaryLabel: dbTemplate.cta_primary_label,
      ctaPrimaryUrl: dbTemplate.cta_primary_url,
      ctaSecondaryLabel: dbTemplate.cta_secondary_label,
      ctaSecondaryUrl: dbTemplate.cta_secondary_url,
      footerText: dbTemplate.footer_text,
      fromName: dbTemplate.from_name,
      fromEmail: dbTemplate.from_email,
      replyToEmail: dbTemplate.reply_to_email,
      variableSchema: dbTemplate.variable_schema as Record<string, string>,
    };
  }
  
  // Fall back to default from registry
  const defaultTemplate = getTemplateDefinition(templateKey);
  if (!defaultTemplate) {
    throw new Error(`Template not found: ${templateKey}`);
  }
  
  return {
    layout: defaultTemplate.layout,
    subject: defaultTemplate.subject,
    preheader: defaultTemplate.preheader,
    heading: defaultTemplate.heading,
    bodyParagraphs: defaultTemplate.bodyParagraphs,
    bulletItems: defaultTemplate.bulletItems,
    ctaPrimaryLabel: defaultTemplate.ctaPrimaryLabel,
    ctaPrimaryUrl: defaultTemplate.ctaPrimaryUrl,
    ctaSecondaryLabel: defaultTemplate.ctaSecondaryLabel,
    ctaSecondaryUrl: defaultTemplate.ctaSecondaryUrl,
    footerText: defaultTemplate.footerText,
    fromName: defaultTemplate.fromName,
    fromEmail: defaultTemplate.fromEmail,
    replyToEmail: defaultTemplate.replyToEmail,
    variableSchema: defaultTemplate.variableSchema,
  };
}

/**
 * Render an email template with variables
 */
export async function renderEmailTemplate(
  templateKey: string,
  variables: Record<string, any>,
  options: RenderOptions = {}
): Promise<{
  html: string;
  text: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
}> {
  // Load template
  const template = await loadTemplate(templateKey);
  
  // Validate variables
  const validation = validateVariables(templateKey, variables, template.variableSchema);
  if (!validation.valid) {
    throw new Error(
      `Missing required variables for template '${templateKey}': ${validation.missing.join(', ')}`
    );
  }
  
  // Substitute variables in all text fields
  const subject = substituteVariables(template.subject, variables);
  const preheader = template.preheader ? substituteVariables(template.preheader, variables) : undefined;
  const heading = substituteVariables(template.heading, variables);
  const bodyParagraphs = template.bodyParagraphs.map(p => substituteVariables(p, variables));
  const bulletItems = template.bulletItems?.map(b => substituteVariables(b, variables));
  const ctaPrimaryLabel = template.ctaPrimaryLabel ? substituteVariables(template.ctaPrimaryLabel, variables) : undefined;
  const ctaPrimaryUrl = template.ctaPrimaryUrl ? substituteVariables(template.ctaPrimaryUrl, variables) : undefined;
  const ctaSecondaryLabel = template.ctaSecondaryLabel ? substituteVariables(template.ctaSecondaryLabel, variables) : undefined;
  const ctaSecondaryUrl = template.ctaSecondaryUrl ? substituteVariables(template.ctaSecondaryUrl, variables) : undefined;
  let footerText = template.footerText ? substituteVariables(template.footerText, variables) : undefined;
  
  // Add unsubscribe link for marketing emails
  if (options.includeUnsubscribe && options.unsubscribeUrl) {
    const unsubscribeLine = `\nUnsubscribe: ${options.unsubscribeUrl}`;
    footerText = (footerText || '') + unsubscribeLine;
  }
  
  // Render using appropriate layout
  let rendered: { html: string; text: string };
  
  if (template.layout === 'HERO') {
    // Get hero-specific props from template definition
    const defaultTemplate = getTemplateDefinition(templateKey);
    
    const heroProps: HeroLayoutProps = {
      subject,
      preheader,
      heroImageUrl: defaultTemplate?.heroImageUrl,
      heroImageAlt: defaultTemplate?.heroImageAlt,
      heroImageHeight: defaultTemplate?.heroImageHeight,
      heading,
      bodyParagraphs,
      bulletItems,
      ctaPrimaryLabel,
      ctaPrimaryUrl,
      ctaSecondaryLabel,
      ctaSecondaryUrl,
      footerText,
    };
    
    rendered = renderHeroLayout(heroProps);
  } else {
    // Standard layout
    const standardProps: StandardLayoutProps = {
      subject,
      preheader,
      heading,
      bodyParagraphs,
      bulletItems,
      ctaPrimaryLabel,
      ctaPrimaryUrl,
      ctaSecondaryLabel,
      ctaSecondaryUrl,
      footerText,
    };
    
    rendered = renderStandardLayout(standardProps);
  }
  
  return {
    html: rendered.html,
    text: rendered.text,
    subject,
    fromName: template.fromName,
    fromEmail: template.fromEmail,
    replyToEmail: template.replyToEmail,
  };
}

/**
 * Validate template copy for placeholder usage
 * Returns list of unknown placeholders found in the template
 */
export function validateTemplatePlaceholders(
  templateCopy: {
    subject: string;
    preheader?: string;
    heading: string;
    bodyParagraphs: string[];
    bulletItems?: string[];
    ctaPrimaryLabel?: string;
    ctaPrimaryUrl?: string;
    ctaSecondaryLabel?: string;
    ctaSecondaryUrl?: string;
  },
  variableSchema: Record<string, string>
): string[] {
  const allowedPlaceholders = Object.keys(variableSchema);
  const unknownPlaceholders = new Set<string>();
  
  // Helper to extract placeholders from text
  const extractPlaceholders = (text: string) => {
    const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
    for (const match of matches) {
      const placeholder = match[1].trim();
      if (!allowedPlaceholders.includes(placeholder)) {
        unknownPlaceholders.add(placeholder);
      }
    }
  };
  
  // Check all text fields
  extractPlaceholders(templateCopy.subject);
  if (templateCopy.preheader) extractPlaceholders(templateCopy.preheader);
  extractPlaceholders(templateCopy.heading);
  templateCopy.bodyParagraphs.forEach(extractPlaceholders);
  templateCopy.bulletItems?.forEach(extractPlaceholders);
  if (templateCopy.ctaPrimaryLabel) extractPlaceholders(templateCopy.ctaPrimaryLabel);
  if (templateCopy.ctaPrimaryUrl) extractPlaceholders(templateCopy.ctaPrimaryUrl);
  if (templateCopy.ctaSecondaryLabel) extractPlaceholders(templateCopy.ctaSecondaryLabel);
  if (templateCopy.ctaSecondaryUrl) extractPlaceholders(templateCopy.ctaSecondaryUrl);
  
  return Array.from(unknownPlaceholders);
}

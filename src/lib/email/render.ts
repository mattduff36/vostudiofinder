/**
 * Email Template Renderer
 * 
 * Loads template from DB, validates placeholders, substitutes variables,
 * and renders using the appropriate locked layout.
 */

import { db } from '@/lib/db';
import { renderStandardLayout } from './layouts/standard';
import { renderHeroLayout } from './layouts/hero';
import { getTemplateDefinition } from './template-registry';

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
  _templateKey: string,
  variables: Record<string, any>,
  variableSchema: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const [key, type] of Object.entries(variableSchema)) {
    const value = variables[key];
    if (value === undefined || value === null) {
      missing.push(key);
    } else if ((type === 'url' || type === 'email') && String(value).trim() === '') {
      missing.push(key);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Load template from database (or fall back to default)
 */
async function loadTemplate(templateKey: string) {
  // Try to load from DB first (gracefully handle table not existing)
  try {
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
  } catch (error) {
    // If table doesn't exist or query fails, fall back to default template
    console.warn(`Failed to load template from DB (falling back to default): ${error}`);
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
  const bodyParagraphs = template.bodyParagraphs
    .map(p => substituteVariables(p, variables))
    .filter(p => p.trim().length > 0); // Remove empty paragraphs after substitution
  const bulletItems = template.bulletItems?.map(b => substituteVariables(b, variables));
  const ctaPrimaryLabel = template.ctaPrimaryLabel ? substituteVariables(template.ctaPrimaryLabel, variables) : undefined;
  const ctaPrimaryUrl = template.ctaPrimaryUrl ? substituteVariables(template.ctaPrimaryUrl, variables) : undefined;
  const ctaSecondaryLabel = template.ctaSecondaryLabel ? substituteVariables(template.ctaSecondaryLabel, variables) : undefined;
  const ctaSecondaryUrl = template.ctaSecondaryUrl ? substituteVariables(template.ctaSecondaryUrl, variables) : undefined;
  let footerText = template.footerText ? substituteVariables(template.footerText, variables) : undefined;
  
  // Unsubscribe URL is passed separately to the layout renderer
  // so it can be displayed as a clean "Click here to unsubscribe" link
  
  // Render using appropriate layout
  let rendered: { html: string; text: string };
  
  if (template.layout === 'HERO') {
    // Get hero-specific props from template definition
    const defaultTemplate = getTemplateDefinition(templateKey);
    
    const heroProps: any = {
      subject,
      heading,
      bodyParagraphs,
    };
    if (preheader) heroProps.preheader = preheader;
    if (defaultTemplate?.heroImageUrl) heroProps.heroImageUrl = defaultTemplate.heroImageUrl;
    if (defaultTemplate?.heroImageAlt) heroProps.heroImageAlt = defaultTemplate.heroImageAlt;
    // heroImageHeight intentionally omitted — image scales to natural aspect ratio
    if (bulletItems) heroProps.bulletItems = bulletItems;
    if (ctaPrimaryLabel) heroProps.ctaPrimaryLabel = ctaPrimaryLabel;
    if (ctaPrimaryUrl) heroProps.ctaPrimaryUrl = ctaPrimaryUrl;
    if (ctaSecondaryLabel) heroProps.ctaSecondaryLabel = ctaSecondaryLabel;
    if (ctaSecondaryUrl) heroProps.ctaSecondaryUrl = ctaSecondaryUrl;
    if (footerText) heroProps.footerText = footerText;
    if (options.includeUnsubscribe && options.unsubscribeUrl) heroProps.unsubscribeUrl = options.unsubscribeUrl;
    
    rendered = renderHeroLayout(heroProps);
  } else {
    // Standard layout
    const standardProps: any = {
      subject,
      heading,
      bodyParagraphs,
    };
    if (preheader) standardProps.preheader = preheader;
    if (bulletItems) standardProps.bulletItems = bulletItems;
    if (ctaPrimaryLabel) standardProps.ctaPrimaryLabel = ctaPrimaryLabel;
    if (ctaPrimaryUrl) standardProps.ctaPrimaryUrl = ctaPrimaryUrl;
    if (ctaSecondaryLabel) standardProps.ctaSecondaryLabel = ctaSecondaryLabel;
    if (ctaSecondaryUrl) standardProps.ctaSecondaryUrl = ctaSecondaryUrl;
    if (footerText) standardProps.footerText = footerText;
    if (options.includeUnsubscribe && options.unsubscribeUrl) standardProps.unsubscribeUrl = options.unsubscribeUrl;
    
    rendered = renderStandardLayout(standardProps);
  }
  
  const result: any = {
    html: rendered.html,
    text: rendered.text,
    subject,
  };
  
  if (template.fromName) result.fromName = template.fromName;
  if (template.fromEmail) result.fromEmail = template.fromEmail;
  if (template.replyToEmail) result.replyToEmail = template.replyToEmail;
  
  return result;
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
    footerText?: string;
  },
  variableSchema: Record<string, string>
): string[] {
  const allowedPlaceholders = Object.keys(variableSchema);
  const unknownPlaceholders = new Set<string>();
  
  // Helper to extract placeholders from text
  const extractPlaceholders = (text: string) => {
    const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
    for (const match of matches) {
      const placeholder = match[1]?.trim();
      if (placeholder && !allowedPlaceholders.includes(placeholder)) {
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
  if (templateCopy.footerText) extractPlaceholders(templateCopy.footerText);
  
  return Array.from(unknownPlaceholders);
}

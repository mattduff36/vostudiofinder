/**
 * Email Template Renderer
 * 
 * Loads template from DB, validates placeholders, substitutes variables,
 * and renders using the appropriate locked layout.
 */

import { renderStandardLayout } from './layouts/standard';
import { renderHeroLayout } from './layouts/hero';
import { loadResolvedTemplate, EmailAdminError } from './template-store';
import type { ResolvedEmailTemplate } from './template-contract';

export interface RenderOptions {
  includeUnsubscribe?: boolean; // Add unsubscribe footer (for marketing emails)
  unsubscribeUrl?: string;
}

/**
 * Substitute {{placeholder}} variables in text
 */
function substituteVariables(text: string, variables: Record<string, unknown>): string {
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
  variables: Record<string, unknown>,
  variableSchema: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const [key, type] of Object.entries(variableSchema)) {
    const value = variables[key];
    if (value === undefined || value === null) {
      missing.push(key);
    } else if (type === 'number' && (String(value).trim() === '' || !Number.isFinite(Number(value)))) {
      missing.push(key);
    } else if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      missing.push(key);
    } else if (type === 'url') {
      try { if (!['https:', 'http:'].includes(new URL(String(value)).protocol)) missing.push(key); }
      catch { missing.push(key); }
    } else if (type === 'date' && !Number.isFinite(Date.parse(String(value)))) {
      missing.push(key);
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Render an email template with variables
 */
export async function renderEmailTemplate(
  templateKey: string,
  variables: Record<string, unknown>,
  options: RenderOptions = {}
) {
  return renderResolvedEmailTemplate(await loadResolvedTemplate(templateKey), variables, options);
}

/** Render an immutable snapshot without consulting the current template/registry. */
export function renderResolvedEmailTemplate(
  template: ResolvedEmailTemplate,
  variables: Record<string, unknown>,
  options: RenderOptions = {}
): { html: string; text: string; subject: string; fromName?: string; fromEmail?: string; replyToEmail?: string } {
  const templateKey = template.key;
  // Validate variables
  const validation = validateVariables(templateKey, variables, template.variableSchema);
  if (!validation.valid) {
    throw new EmailAdminError(
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
  for (const url of [ctaPrimaryUrl, ctaSecondaryUrl]) {
    if (!url) continue;
    try { if (!['https:', 'http:'].includes(new URL(url).protocol)) throw new Error('protocol'); }
    catch { throw new EmailAdminError('A button URL is invalid after substituting the variables'); }
  }
  const footerText = template.footerText ? substituteVariables(template.footerText, variables) : undefined;
  
  // Unsubscribe URL is passed separately to the layout renderer
  // so it can be displayed as a clean "Click here to unsubscribe" link
  
  // Render using appropriate layout
  let rendered: { html: string; text: string };
  
  if (template.layout === 'HERO') {
    const heroProps: Parameters<typeof renderHeroLayout>[0] = {
      subject,
      heading,
      bodyParagraphs,
    };
    if (preheader) heroProps.preheader = preheader;
    if (template.heroImageUrl) heroProps.heroImageUrl = template.heroImageUrl;
    if (template.heroImageAlt) heroProps.heroImageAlt = template.heroImageAlt;
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
    const standardProps: Parameters<typeof renderStandardLayout>[0] = {
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
  
  const result: { html: string; text: string; subject: string; fromName?: string; fromEmail?: string; replyToEmail?: string } = {
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

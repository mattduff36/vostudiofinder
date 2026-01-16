import { decodeHtmlEntities } from './text';

/**
 * Strip all HTML tags from a string while preserving plain text content
 * @param input - The string to sanitize
 * @returns The sanitized string with HTML tags removed
 */
export function stripHtmlTags(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  // First, decode any HTML entities to their character equivalents
  let cleaned = decodeHtmlEntities(input);

  // Remove all HTML tags using regex
  // This pattern matches: <tagname>, </tagname>, <tagname/>, <tagname attr="value">
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // Remove any remaining HTML entities that weren't decoded
  // (in case someone uses double-encoding like &amp;lt;)
  cleaned = decodeHtmlEntities(cleaned);

  // Clean up excessive whitespace that might result from tag removal
  // NOTE: We preserve single spaces for normal text input
  cleaned = cleaned
    // Normalize multiple newlines to max 2 consecutive (one blank line)
    .replace(/(\s*\n){3,}/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim();

  return cleaned;
}

/**
 * Strip HTML tags from multiple fields in an object
 * @param obj - Object containing fields to sanitize
 * @param fields - Array of field names to sanitize
 * @returns New object with sanitized fields
 */
export function stripHtmlFromFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const sanitized = { ...obj };
  
  fields.forEach((field) => {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = stripHtmlTags(sanitized[field] as string) as T[keyof T];
    }
  });

  return sanitized;
}

/**
 * Clean studio description text by removing escaped characters and HTML entities
 * For short_about fields, return empty string if no valid content exists
 */
export function cleanDescription(description: string | null | undefined): string {
  if (!description) return '';
  
  // First decode HTML entities using our comprehensive decoder
  let cleaned = decodeHtmlEntities(description);
  
  // Clean up escaped characters and normalize whitespace
  cleaned = cleaned
    // Remove escaped newlines and carriage returns
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    // Clean up multiple spaces but preserve line breaks
    .replace(/[ \t]+/g, ' ')
    // Normalize multiple newlines to max 2 consecutive (one blank line)
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // Remove trailing line breaks at the end
    .replace(/\n+$/g, '')
    .trim();
  
  // Handle numeric descriptions (common issue from admin project updates)
  // Check if the cleaned description is only numbers and whitespace/newlines
  const numbersOnly = cleaned.replace(/[\s\n\r]+/g, ''); // Remove all whitespace
  if (/^\d+$/.test(numbersOnly) || /^\d+\.\d+$/.test(numbersOnly)) {
    return ''; // Return empty string instead of placeholder for short_about fields
  }
  
  // If description is very short and seems like placeholder data, return empty
  if (cleaned.length < 10 && /^[\d\s\n\r.,-]+$/.test(cleaned)) {
    return ''; // Return empty string instead of placeholder for short_about fields
  }
  
  return cleaned;
}

/**
 * Decode HTML entities in text
 */
export function decodeHtmlEntities(str: string | null | undefined): string {
  if (!str) return '';
  
  const htmlEntities: { [key: string]: string } = {
    '&pound;': '£',
    '&euro;': '€',
    '&dollar;': '$',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&ndash;': '–',
    '&hellip;': '…',
    '&lsquo;': "'",
    '&mdash;': '—',
    '&#039;': "'",
    '&iacute;': 'í',
    '&eacute;': 'é',
    '&aacute;': 'á',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&ntilde;': 'ñ',
    '&ccedil;': 'ç',
    '&agrave;': 'à',
    '&egrave;': 'è',
    '&igrave;': 'ì',
    '&ograve;': 'ò',
    '&ugrave;': 'ù'
  };
  
  return str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
}

/**
 * Truncate text to a specific length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

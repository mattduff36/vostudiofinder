/**
 * Clean studio description text by removing escaped characters and HTML entities
 * For short_about fields, return empty string if no valid content exists
 */
export function cleanDescription(description: string | null | undefined): string {
  if (!description) return '';
  
  // First strip any HTML tags for security
  let cleaned = description.replace(/<[^>]*>/g, '');
  
  // Then decode HTML entities using our comprehensive decoder
  cleaned = decodeHtmlEntities(cleaned);
  
  // Clean up escaped characters and normalize whitespace
  cleaned = cleaned
    // Remove escaped newlines and carriage returns
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    // Clean up multiple spaces but preserve line breaks
    .replace(/[ \t]+/g, ' ')
    // Normalize multiple newlines to max 2 consecutive (one blank line)
    // Matches 2+ newlines with optional whitespace between them
    .replace(/(\s*\n){2,}/g, '\n\n')
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
 * Escape HTML special characters to prevent XSS when interpolating user input into HTML
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null || typeof text !== 'string') return '';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Format a display name for safe use in RFC 5322 email headers (e.g. From, To).
 * Strips control characters (including CRLF) that could inject headers, then
 * properly quotes and escapes per RFC 5322. Prevents header injection.
 */
export function formatRfc5322DisplayName(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') return 'User';
  // Strip control characters and CRLF that could inject additional headers
  let safe = name.replace(/[\x00-\x1F\x7F\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe) return 'User';
  // Escape backslashes and double quotes for RFC 5322 quoted-string
  safe = safe.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${safe}"`;
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

/**
 * Utility functions for address formatting and privacy
 */

/**
 * Abbreviates an address for privacy by removing the first line and truncating postcodes/zip codes
 * @param fullAddress - The complete address string
 * @returns Abbreviated address for privacy
 */
export function abbreviateAddress(fullAddress: string): string {
  if (!fullAddress || fullAddress.trim() === '') {
    return '';
  }

  // Split address by common delimiters (comma, newline)
  const parts = fullAddress.split(/[,\n]/).map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return '';
  }

  // If only one part, check if it's just a postcode/zip and return as is
  if (parts.length === 1) {
    return abbreviatePostalCode(parts[0] || '');
  }

  // Remove the first part (street address/house number)
  const addressWithoutStreet = parts.slice(1);
  
  // Process the last part to abbreviate postal codes
  if (addressWithoutStreet.length > 0) {
    const lastIndex = addressWithoutStreet.length - 1;
    addressWithoutStreet[lastIndex] = abbreviatePostalCode(addressWithoutStreet[lastIndex] || '');
  }

  return addressWithoutStreet.join(', ');
}

/**
 * Abbreviates postal codes (UK postcodes, US ZIP codes, etc.) for privacy
 * @param text - Text that may contain a postal code
 * @returns Text with abbreviated postal code
 */
export function abbreviatePostalCode(text: string): string {
  if (!text) return '';

  // UK Postcode patterns - keep first part only
  // Examples: "SW1A 1AA" -> "SW1A", "M1 1AA" -> "M1", "W1A 0AX" -> "W1A"
  const ukPostcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s+\d[A-Z]{2}\b/gi;
  text = text.replace(ukPostcodeRegex, '$1');

  // US ZIP+4 codes - keep only first 5 digits
  // Examples: "12345-6789" -> "12345"
  const zipPlus4Regex = /\b(\d{5})-\d{4}\b/g;
  text = text.replace(zipPlus4Regex, '$1');

  // Canadian postal codes - keep first 3 characters
  // Examples: "K1A 0A6" -> "K1A"
  const canadianPostalRegex = /\b([A-Z]\d[A-Z])\s+\d[A-Z]\d\b/gi;
  text = text.replace(canadianPostalRegex, '$1');

  // Australian postcodes are just 4 digits, keep as is
  // German postcodes are 5 digits, keep first 3
  const germanPostcodeRegex = /\b(\d{2})\d{3}\b/g;
  text = text.replace(germanPostcodeRegex, '$1***');

  // French postcodes are 5 digits, keep first 2
  const frenchPostcodeRegex = /\b(\d{2})\d{3}\b/g;
  text = text.replace(frenchPostcodeRegex, '$1***');

  return text;
}

/**
 * Calculates distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point  
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formats a user's display name for search suggestions (name only, location will be separate)
 * @param username - User's username
 * @param display_name - User's display name
 * @returns Formatted string for display (e.g., "VoiceoverGuy")
 */
export function formatUserSuggestion(username: string, display_name: string): string {
  return display_name || username;
}

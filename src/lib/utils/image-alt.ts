import { extractCity, abbreviateAddress } from './address';

/**
 * Generates a descriptive alt tag for studio images
 * @param studioName - Name of the studio
 * @param location - Full address or location string
 * @param existingAltText - User-provided alt text (if any)
 * @param imageIndex - Index of image (for multiple images)
 * @returns Descriptive alt text for accessibility
 */
export function generateStudioImageAlt(
  studioName: string,
  location?: string | null,
  existingAltText?: string | null,
  imageIndex?: number
): string {
  // If user provided custom alt text, use it
  if (existingAltText && existingAltText.trim()) {
    return existingAltText;
  }

  // Extract city/region from location
  const city = location ? extractCity(location) : null;
  
  // Build descriptive alt text
  if (city) {
    const indexSuffix = imageIndex && imageIndex > 0 ? ` - Image ${imageIndex + 1}` : '';
    return `${studioName} in ${city}${indexSuffix}`;
  } else if (location) {
    // Fallback: use abbreviated address
    const abbreviated = abbreviateAddress(location);
    const indexSuffix = imageIndex && imageIndex > 0 ? ` - Image ${imageIndex + 1}` : '';
    return abbreviated ? `${studioName} in ${abbreviated}${indexSuffix}` : `${studioName} Studio`;
  }
  
  // Final fallback
  return `${studioName} Studio`;
}


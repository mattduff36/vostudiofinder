/**
 * Utility functions for address formatting and privacy
 */

/**
 * Check if an address looks like a complete, full address
 * (not just a country name or very short)
 */
export function isCompleteAddress(address: string | null | undefined): boolean {
  if (!address || address.trim() === '') return false;
  
  const trimmed = address.trim();
  
  // Very short addresses are likely incomplete
  if (trimmed.length < 10) return false;
  
  // Common country-only addresses
  const countryOnlyPatterns = [
    /^(United States|United Kingdom|Canada|Australia|France|Germany|Spain|Italy|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Ireland|Portugal|Poland|Greece|Czech Republic|Hungary|Romania|Bulgaria|Croatia|Slovakia|Slovenia|Estonia|Latvia|Lithuania|Luxembourg|Malta|Cyprus|Iceland|Liechtenstein|Monaco|San Marino|Vatican City|Andorra)$/i,
    /^(USA|UK|U\.S\.A\.|U\.K\.)$/i,
    /^(India|China|Japan|South Korea|Brazil|Mexico|Argentina|Chile|Colombia|Peru|Venezuela|Ecuador|Bolivia|Paraguay|Uruguay|Guyana|Suriname|French Guiana)$/i,
    /^(Russia|Ukraine|Belarus|Kazakhstan|Uzbekistan|Azerbaijan|Armenia|Georgia|Moldova|Kyrgyzstan|Tajikistan|Turkmenistan)$/i,
    /^(Egypt|South Africa|Nigeria|Kenya|Morocco|Tunisia|Algeria|Ethiopia|Ghana|Tanzania|Uganda|Sudan|Angola|Mozambique|Madagascar|Cameroon|Ivory Coast|Niger|Burkina Faso|Mali|Malawi|Zambia|Senegal|Zimbabwe|Chad|Guinea|Rwanda|Benin|Burundi|Tunisia|Somalia|Guinea-Bissau|Eritrea|Sierra Leone|Togo|Central African Republic|Liberia|Mauritania|Lesotho|Gambia|Botswana|Namibia|Gabon|Mauritius|Eswatini|Djibouti|Equatorial Guinea|Comoros|Cape Verde|Sao Tome and Principe|Seychelles)$/i,
    /^(Thailand|Vietnam|Indonesia|Philippines|Malaysia|Singapore|Myanmar|Cambodia|Laos|Brunei|East Timor|Mongolia|Nepal|Bhutan|Bangladesh|Sri Lanka|Maldives|Afghanistan|Pakistan|Iran|Iraq|Saudi Arabia|United Arab Emirates|Israel|Jordan|Lebanon|Syria|Yemen|Oman|Kuwait|Qatar|Bahrain|Turkey)$/i,
  ];
  
  // Check if it's just a country name
  for (const pattern of countryOnlyPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  // Check if it contains indicators of a complete address:
  // - Street numbers (digits at start or after comma)
  // - Postcodes (UK format: letters + numbers, or just numbers in many countries)
  // - Street names (words like "Street", "Road", "Avenue", "Lane", etc.)
  
  const hasStreetNumber = /\d+/.test(trimmed); // Contains numbers
  const hasStreetName = /\b(Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Court|Ct|Place|Pl|Close|Crescent|Cres|Grove|Gardens|Gdns|Square|Sq|Terrace|Ter|Park|Hill|View|Mews|Walk|Row|Green|Common|Heath|Moor|Bridge|Gate|End|Corner|Junction|Cross|Roundabout|Circus|Vale|Dale|Rise|Mount|Mountain|Valley|Wood|Forest|Field|Meadow|Orchard|Garden|Yard|Alley|Path|Track|Route|Highway|Freeway|Motorway|Turnpike)\b/i.test(trimmed);
  const hasPostcode = /\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/i.test(trimmed) || // UK format
                      /\b\d{4,6}\b/.test(trimmed) || // Numeric postcodes
                      /\b\d{5}(-\d{4})?\b/.test(trimmed); // US ZIP codes
  
  // If it has at least 2 of these indicators, it's likely a complete address
  const indicators = [hasStreetNumber, hasStreetName, hasPostcode].filter(Boolean).length;
  
  return indicators >= 2 || (hasStreetNumber && trimmed.length > 20);
}

// Major UK cities to prioritize when extracting city from addresses
// This helps distinguish between villages/towns and actual cities
const UK_MAJOR_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Glasgow', 'Edinburgh', 'Liverpool', 
  'Leeds', 'Sheffield', 'Bristol', 'Newcastle', 'Cardiff', 'Belfast', 
  'Nottingham', 'Leicester', 'Southampton', 'Brighton', 'Hull', 'Plymouth',
  'Stoke', 'Wolverhampton', 'Derby', 'Swansea', 'Aberdeen', 'Portsmouth',
  'York', 'Peterborough', 'Dundee', 'Lancaster', 'Oxford', 'Cambridge',
  'Ipswich', 'Norwich', 'Luton', 'Solihull', 'Coventry', 'Reading',
  'Bradford', 'Sunderland', 'Preston', 'Exeter', 'Chelmsford', 'Gloucester',
  'Salisbury', 'Chester', 'Bath', 'Durham', 'Inverness', 'Stirling',
  'Perth', 'Canterbury', 'Winchester', 'Worcester', 'Carlisle', 'Truro'
];

/**
 * Extracts the city name from a full address
 * @param fullAddress - The complete address string
 * @returns City name extracted from the address
 * 
 * Examples:
 * - "123 Main St, London, SW1A 1AA" → "London"
 * - "456 Oak Ave, Los Angeles, CA 90001" → "Los Angeles"
 * - "789 Elm St, Edwinstowe, Nottingham, NG21 9PR, UK" → "Nottingham"
 * - "10 High St, Hove, Brighton, BN3 1AB" → "Brighton"
 */
export function extractCity(fullAddress: string): string {
  if (!fullAddress || fullAddress.trim() === '') {
    return '';
  }

  // Split address by common delimiters (comma, newline)
  const parts = fullAddress.split(/[,\n]/).map(part => part.trim()).filter(part => part.length > 0);

  if (parts.length === 0) {
    return '';
  }

  // If only one part, return it as is (likely just a city name)
  if (parts.length === 1) {
    return parts[0] || '';
  }

  // Strategy 1: Look for known UK major cities in the address parts
  // This handles cases like "Street, Village, City, Postcode"
  for (const part of parts) {
    // Clean the part (remove postcodes first)
    const cleanedPart = part
      .replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi, '') // UK postcodes
      .replace(/\b\d{5}(-\d{4})?\b/g, '') // US ZIP codes
      .trim();
    
    // Check if this part matches a known UK city (case-insensitive)
    const matchedCity = UK_MAJOR_CITIES.find(
      city => cleanedPart.toLowerCase() === city.toLowerCase()
    );
    
    if (matchedCity) {
      return matchedCity;
    }
  }

  // Strategy 2: For non-UK or unrecognized cities, use heuristics
  // Skip the first part (street address) and look for a city-like component
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i] || '';
    
    // Skip parts that look like postcodes
    if (/^[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}$/i.test(part)) {
      continue;
    }
    
    // Skip parts that are just ZIP codes
    if (/^\d{5}(-\d{4})?$/.test(part)) {
      continue;
    }
    
    // Skip parts that are country names
    if (/^(UK|USA|United Kingdom|United States)$/i.test(part)) {
      continue;
    }
    
    // Skip parts that look like US states (2 letter codes)
    if (/^[A-Z]{2}$/.test(part)) {
      continue;
    }
    
    // Clean the part
    const cleanedPart = part
      .replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi, '') // UK postcodes
      .replace(/\b\d{5}(-\d{4})?\b/g, '') // US ZIP codes
      .trim();
    
    // If we have a substantial part left, it's likely the city
    if (cleanedPart.length >= 2) {
      return cleanedPart;
    }
  }

  // Fallback: Return the second part (traditional approach)
  if (parts.length >= 2) {
    const cityCandidate = parts[1] || '';
    const cleanedCity = cityCandidate
      .replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/gi, '')
      .replace(/\b\d{5}(-\d{4})?\b/g, '')
      .trim();
    
    return cleanedCity || cityCandidate;
  }

  return '';
}

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

/**
 * Shared formatting helpers for autocomplete suggestions.
 * Used by both EnhancedSearchBar (home) and EnhancedLocationFilter (/studios).
 */

/**
 * Formats a Google Place result into a consistent display string.
 *
 * Rules:
 * - Establishments (name differs from formatted_address): "Name - formatted_address"
 * - Regular locations: formatted_address as-is
 */
export function formatPlaceLabel(place: {
  name?: string;
  formatted_address?: string;
  description?: string;
}): string {
  const fullAddress = place.formatted_address || place.name || place.description || '';

  // Detect establishment: name is meaningful and NOT just the start of the address
  const isEstablishment =
    place.name &&
    place.formatted_address &&
    !place.formatted_address.startsWith(place.name);

  if (isEstablishment) {
    return `${place.name} - ${place.formatted_address}`;
  }

  return fullAddress;
}

/**
 * Shared sorting logic for autocomplete suggestions.
 * Both home and /studios use the same sort order for location results.
 */

export interface SortableSuggestion {
  text: string;
  type: string;
  distance?: number;
}

/**
 * Sorts suggestions using a unified ranking:
 *
 * 1. Exact prefix matches first.
 * 2. Among same prefix-match status: sort by distance (closest first).
 * 3. Fallback to alphabetical.
 *
 * Studio suggestions (type === 'studio') always rank above everything
 * when `boostStudios` is true (home page only).
 *
 * Location suggestions rank above user suggestions by default.
 */
export function sortSuggestions<T extends SortableSuggestion>(
  items: T[],
  query: string,
  options: { boostStudios?: boolean } = {}
): T[] {
  const q = query.toLowerCase();
  const { boostStudios = false } = options;

  return [...items].sort((a, b) => {
    // Studio boost (home page): studios always on top
    if (boostStudios) {
      if (a.type === 'studio' && b.type !== 'studio') return -1;
      if (a.type !== 'studio' && b.type === 'studio') return 1;
    }

    // Locations above users (but below studios when boosted)
    if (a.type === 'location' && b.type === 'user') return -1;
    if (a.type === 'user' && b.type === 'location') return 1;

    // Within same type group: exact prefix matches first
    const aExact = a.text.toLowerCase().startsWith(q);
    const bExact = b.text.toLowerCase().startsWith(q);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // Then by distance (closest first)
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    if (a.distance !== undefined && b.distance === undefined) return -1;
    if (a.distance === undefined && b.distance !== undefined) return 1;

    // Fallback to alphabetical
    return a.text.localeCompare(b.text);
  });
}

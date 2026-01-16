/**
 * Utility functions for formatting studio types
 */

/**
 * Convert a studio type enum value to a UI-friendly label
 * @param studioType - The studio type enum value (e.g., 'AUDIO_PRODUCER', 'VO_COACH')
 * @returns Formatted label (e.g., 'Audio Producer', 'VO Coach')
 */
export function formatStudioTypeLabel(studioType: string): string {
  // Handle empty or invalid input
  if (!studioType || typeof studioType !== 'string') {
    return '';
  }

  // Split by underscore and capitalize each word
  return studioType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert a studio type enum value to a tooltip-friendly description
 * @param studioType - The studio type enum value
 * @returns Tooltip description
 */
export function getStudioTypeTooltip(studioType: string): string {
  const tooltips: Record<string, string> = {
    VOICEOVER: 'Professional voiceover recording facility',
    PODCAST: 'Podcast recording and production studio',
    RECORDING: 'Music and audio recording studio',
    AUDIO_PRODUCER: 'Professional audio production services',
    VO_COACH: 'Voiceover coaching and training services',
    HOME: 'Home-based studio setup',
  };

  return tooltips[studioType] || formatStudioTypeLabel(studioType);
}

/**
 * Format date with relative time for up to 5 days, then show full date
 */
export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // If less than 1 hour ago
  if (diffMinutes < 60) {
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    return `${diffMinutes} minutes ago`;
  }
  
  // If less than 24 hours ago
  if (diffHours < 24) {
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  }
  
  // If within 5 days, show relative time
  if (diffDays <= 5) {
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
  
  // Otherwise show formatted date
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format date consistently across the app (DD/MM/YYYY)
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}


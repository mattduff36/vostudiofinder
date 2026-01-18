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
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format date and time consistently across the app (DD/MM/YYYY, HH:MM:SS)
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return dateObj.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format days as "X years, Y months, Z days"
 * Intelligently handles singular/plural and omits zero values
 * 
 * Examples:
 * - 400 days → "1 year, 1 month, 5 days"
 * - 45 days → "1 month, 15 days"
 * - 10 days → "10 days"
 * - 1 day → "1 day"
 * - 365 days → "1 year"
 * - 730 days → "2 years"
 * 
 * @param totalDays Total number of days
 * @returns Formatted string with years, months, and days
 */
export function formatDaysAsYearsMonthsDays(totalDays: number): string {
  if (totalDays === 0) return '0 days';
  if (totalDays === 1) return '1 day';
  
  // Calculate years (365 days per year)
  const years = Math.floor(totalDays / 365);
  let remainingDays = totalDays % 365;
  
  // Calculate months (30 days per month for simplicity)
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;
  
  // Build the result array
  const parts: string[] = [];
  
  if (years > 0) {
    parts.push(years === 1 ? '1 year' : `${years} years`);
  }
  
  if (months > 0) {
    parts.push(months === 1 ? '1 month' : `${months} months`);
  }
  
  if (days > 0) {
    parts.push(days === 1 ? '1 day' : `${days} days`);
  }
  
  // Join with commas, but use 'and' for the last item if there are multiple parts
  if (parts.length === 0) return '0 days';
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return parts.join(' and ');
  
  // For 3 parts: "X years, Y months and Z days"
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]!;
}


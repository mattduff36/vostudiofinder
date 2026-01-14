/**
 * Membership Renewal Utilities
 * 
 * Handles calculations and logic for membership renewals:
 * - Early Renewal: £25 with 30-day bonus (requires >= 30 days remaining)
 * - 5-Year Renewal: £80 for 5 years (1,825 days)
 */

/**
 * Calculate new expiry date for early renewal
 * Adds 365 days (1 year) + 30 bonus days to current expiry
 * 
 * @param currentExpiry Current membership expiry date
 * @returns New expiry date (current + 365 days + 30 bonus days)
 */
export function calculateEarlyRenewalExpiry(currentExpiry: Date): Date {
  // Convert to Date object if string (defensive programming)
  const expiryDate = currentExpiry instanceof Date ? currentExpiry : new Date(currentExpiry);
  
  const newExpiry = new Date(expiryDate);
  newExpiry.setDate(newExpiry.getDate() + 365 + 30); // 395 days total
  return newExpiry;
}

/**
 * Calculate new expiry date for 5-year renewal
 * Adds 1,825 days (5 years) to current expiry or now if expired
 * 
 * @param currentExpiry Current membership expiry date (or null if none)
 * @returns New expiry date (current/now + 1825 days)
 */
export function calculate5YearRenewalExpiry(currentExpiry: Date | null): Date {
  // Convert to Date object if string (defensive programming)
  let expiryDate: Date | null = null;
  if (currentExpiry) {
    expiryDate = currentExpiry instanceof Date ? currentExpiry : new Date(currentExpiry);
  }
  
  // If membership is expired or doesn't exist, start from now
  const baseDate = expiryDate && expiryDate > new Date() 
    ? expiryDate 
    : new Date();
  
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + 1825); // 5 years
  return newExpiry;
}

/**
 * Check if user is eligible for early renewal bonus
 * User must have >= 30 days remaining to get the bonus
 * 
 * @param daysRemaining Days until current membership expiry
 * @returns true if >= 30 days remaining, false otherwise
 */
export function isEligibleForEarlyRenewal(daysRemaining: number): boolean {
  return daysRemaining >= 30;
}

/**
 * Calculate days until expiry from a date
 * 
 * @param expiryDate Membership expiry date
 * @returns Number of days until expiry (negative if expired)
 */
export function calculateDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format renewal period breakdown for display
 * Shows current days, added days, bonus, and total
 * 
 * @param daysRemaining Current days remaining on membership
 * @param renewalType Type of renewal ('early' or '5year')
 * @returns Breakdown object with all periods
 */
export function formatRenewalBreakdown(
  daysRemaining: number,
  renewalType: 'early' | '5year'
): {
  current: number;
  added: number;
  bonus: number;
  total: number;
} {
  if (renewalType === 'early') {
    return {
      current: daysRemaining, // Keep original for display logic
      added: 365,
      bonus: 30,
      total: 365 + 30, // Only the renewal period, not including current days
    };
  } else {
    return {
      current: daysRemaining, // Keep original for display logic
      added: 1825,
      bonus: 0,
      total: 1825, // Only the renewal period, not including current days
    };
  }
}

/**
 * Calculate the final expiry date that will result from a renewal
 * Matches the backend logic exactly for UI preview
 * 
 * @param currentExpiry Current membership expiry date (or null if none)
 * @param renewalType Type of renewal
 * @returns The new expiry date after renewal
 */
export function calculateFinalExpiryForDisplay(
  currentExpiry: Date | null,
  renewalType: 'early' | '5year'
): Date {
  if (renewalType === 'early') {
    // Early renewal always extends from current expiry
    if (!currentExpiry) {
      throw new Error('Early renewal requires existing expiry date');
    }
    return calculateEarlyRenewalExpiry(currentExpiry);
  } else {
    // 5-year renewal uses backend logic (today if expired)
    return calculate5YearRenewalExpiry(currentExpiry);
  }
}

/**
 * Get renewal price information
 * 
 * @param renewalType Type of renewal
 * @returns Price details
 */
export function getRenewalPrice(renewalType: 'early' | '5year'): {
  amount: number;
  currency: string;
  formatted: string;
  savings?: string;
} {
  if (renewalType === 'early') {
    return {
      amount: 25,
      currency: 'GBP',
      formatted: '£25',
    };
  } else {
    return {
      amount: 80,
      currency: 'GBP',
      formatted: '£80',
      savings: '£45',
    };
  }
}

/**
 * Validate renewal request
 * Checks if renewal type is valid and user is eligible
 * 
 * @param renewalType Type of renewal
 * @param daysRemaining Days until current expiry
 * @returns Validation result with error message if invalid
 */
export function validateRenewalRequest(
  renewalType: 'early' | '5year',
  daysRemaining: number
): { valid: boolean; error?: string } {
  // Validate renewal type
  if (renewalType !== 'early' && renewalType !== '5year') {
    return {
      valid: false,
      error: 'Invalid renewal type',
    };
  }

  // Early renewal requires >= 30 days remaining for bonus
  if (renewalType === 'early' && daysRemaining < 30) {
    return {
      valid: false,
      error: 'Early renewal bonus not available - less than 30 days remaining. Please use 5-year option or wait until expiry.',
    };
  }

  return { valid: true };
}

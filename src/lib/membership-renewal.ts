/**
 * Membership Renewal Utilities
 * 
 * Handles calculations and logic for membership renewals:
 * - Early Renewal: £25 with 30-day bonus (requires >= 180 days remaining - first 6 months)
 * - Standard Renewal: £25 for 1 year (no bonus, available when < 180 days remaining - last 6 months)
 * - 5-Year Renewal: £80 for 5 years (1,825 days) - always available
 */

/**
 * Calculate new expiry date for early renewal (with bonus)
 * Adds 365 days (1 year) + 30 bonus days to current expiry
 * Only available when >= 180 days remaining
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
 * Calculate new expiry date for standard renewal (no bonus)
 * Adds 365 days (1 year) to current expiry
 * Available when < 180 days remaining
 * 
 * @param currentExpiry Current membership expiry date
 * @returns New expiry date (current + 365 days)
 */
export function calculateStandardRenewalExpiry(currentExpiry: Date): Date {
  // Convert to Date object if string (defensive programming)
  const expiryDate = currentExpiry instanceof Date ? currentExpiry : new Date(currentExpiry);
  
  const newExpiry = new Date(expiryDate);
  newExpiry.setDate(newExpiry.getDate() + 365); // 365 days, no bonus
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
 * User must have >= 180 days (6 months) remaining to get the 30-day bonus
 * 
 * @param daysRemaining Days until current membership expiry
 * @returns true if >= 180 days remaining, false otherwise
 */
export function isEligibleForEarlyRenewal(daysRemaining: number): boolean {
  return daysRemaining >= 180;
}

/**
 * Check if user is eligible for standard renewal (no bonus)
 * Available when < 180 days remaining (last 6 months)
 * 
 * @param daysRemaining Days until current membership expiry
 * @returns true if 0 <= days < 180, false otherwise
 */
export function isEligibleForStandardRenewal(daysRemaining: number): boolean {
  return daysRemaining >= 0 && daysRemaining < 180;
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
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format renewal period breakdown for display
 * Shows current days, added days, bonus, and total
 * 
 * @param daysRemaining Current days remaining on membership
 * @param renewalType Type of renewal ('early', 'standard', or '5year')
 * @returns Breakdown object with all periods
 */
export function formatRenewalBreakdown(
  daysRemaining: number,
  renewalType: 'early' | 'standard' | '5year'
): {
  current: number;
  added: number;
  bonus: number;
  total: number;
} {
  if (renewalType === 'early') {
    return {
      current: daysRemaining,
      added: 365,
      bonus: 30,
      total: 365 + 30, // 1 year + 30-day bonus
    };
  } else if (renewalType === 'standard') {
    return {
      current: daysRemaining,
      added: 365,
      bonus: 0,
      total: 365, // 1 year, no bonus
    };
  } else {
    return {
      current: daysRemaining,
      added: 1825,
      bonus: 0,
      total: 1825, // 5 years
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
  renewalType: 'early' | 'standard' | '5year'
): Date {
  if (renewalType === 'early') {
    // Early renewal always extends from current expiry (with bonus)
    if (!currentExpiry) {
      throw new Error('Early renewal requires existing expiry date');
    }
    return calculateEarlyRenewalExpiry(currentExpiry);
  } else if (renewalType === 'standard') {
    // Standard renewal extends from current expiry (no bonus)
    if (!currentExpiry) {
      throw new Error('Standard renewal requires existing expiry date');
    }
    return calculateStandardRenewalExpiry(currentExpiry);
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
export function getRenewalPrice(renewalType: 'early' | 'standard' | '5year'): {
  amount: number;
  currency: string;
  formatted: string;
  savings?: string;
} {
  if (renewalType === 'early' || renewalType === 'standard') {
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
  renewalType: 'early' | 'standard' | '5year',
  daysRemaining: number
): { valid: boolean; error?: string } {
  // Validate renewal type
  if (renewalType !== 'early' && renewalType !== 'standard' && renewalType !== '5year') {
    return {
      valid: false,
      error: 'Invalid renewal type',
    };
  }

  // Early renewal requires >= 180 days remaining (6 months) for bonus
  if (renewalType === 'early' && daysRemaining < 180) {
    return {
      valid: false,
      error: 'Early renewal bonus not available - less than 6 months remaining. Please use standard renewal.',
    };
  }

  // Standard renewal requires >= 0 days (not expired) and < 180 days
  if (renewalType === 'standard' && (daysRemaining < 0 || daysRemaining >= 180)) {
    return {
      valid: false,
      error: 'Standard renewal not available. Use early renewal (6+ months remaining) or 5-year option.',
    };
  }

  return { valid: true };
}

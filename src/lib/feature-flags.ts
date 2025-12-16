/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for gradual rollout and A/B testing.
 * 
 * Usage:
 *   import { isMobileFeatureEnabled } from '@/lib/feature-flags';
 *   if (isMobileFeatureEnabled(1)) {
 *     return <MobileComponent />;
 *   }
 * 
 * Environment Variables:
 *   NEXT_PUBLIC_ENABLE_MOBILE_OVERHAUL=true
 *   NEXT_PUBLIC_MOBILE_PHASE=1
 */

export const featureFlags = {
  /**
   * Mobile Overhaul Feature Flag
   * 
   * Phase 1: Bottom nav + mobile menu + collapsed footer
   * Phase 2: Studios page (filter drawer + collapsible map)
   * Phase 3: Profile pages (compact hero + contact bar)
   * Phase 4: Dashboard (task cards + mobile forms)
   * Phase 5: Polish (accessibility + performance)
   */
  mobileOverhaul: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_MOBILE_OVERHAUL === 'true',
    phase: parseInt(process.env.NEXT_PUBLIC_MOBILE_PHASE || '0', 10),
  },
} as const;

/**
 * Check if a mobile feature phase is enabled
 * 
 * @param phase - The phase number to check (1-5)
 * @returns true if the mobile overhaul is enabled and the current phase >= requested phase
 * 
 * @example
 * // In component
 * if (isMobileFeatureEnabled(1)) {
 *   return <BottomNav />;
 * }
 */
export function isMobileFeatureEnabled(phase: number): boolean {
  return featureFlags.mobileOverhaul.enabled && 
         featureFlags.mobileOverhaul.phase >= phase;
}

/**
 * Get current mobile phase
 * 
 * @returns Current phase number (0 = disabled, 1-5 = active phase)
 */
export function getCurrentMobilePhase(): number {
  if (!featureFlags.mobileOverhaul.enabled) {
    return 0;
  }
  return featureFlags.mobileOverhaul.phase;
}

/**
 * Check if mobile overhaul is fully enabled (all phases)
 */
export function isMobileOverhaulComplete(): boolean {
  return isMobileFeatureEnabled(5);
}

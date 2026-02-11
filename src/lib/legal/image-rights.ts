/**
 * Image rights confirmation constants.
 *
 * The exact wording is stored alongside each confirmation record so that,
 * if the text is ever updated, we retain a faithful audit trail of what
 * the user actually agreed to at the time they confirmed.
 */

export const IMAGE_RIGHTS_CONFIRMATION_TEXT =
  'I confirm I own the rights to these images or have permission to use them.';

/**
 * Extract the best-effort client IP from request headers.
 * Prefers x-forwarded-for (first entry), then x-real-ip, else null.
 */
export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return null;
}

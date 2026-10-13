import crypto from 'crypto';

export type SentrySignatureAssessment = 'ok' | 'missing' | 'malformed' | 'invalid';

const HEX_SHA256 = /^[0-9a-f]{64}$/i;

/**
 * Verify a Sentry hook signature against the raw request body.
 * Missing, non-hex, and wrong-length values never reach timingSafeEqual.
 */
export function assessSentryHookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): SentrySignatureAssessment {
  if (signature == null || signature.trim() === '') return 'missing';

  const candidate = signature.trim();
  if (!HEX_SHA256.test(candidate)) return 'malformed';

  const provided = Buffer.from(candidate, 'hex');
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  if (provided.length !== expected.length) return 'malformed';

  return crypto.timingSafeEqual(provided, expected) ? 'ok' : 'invalid';
}

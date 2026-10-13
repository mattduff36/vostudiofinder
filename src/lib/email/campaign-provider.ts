import { Resend } from 'resend';
import { z } from 'zod';

const header = z.string().min(1).refine(value => !/[\r\n]/.test(value), 'Invalid email header');
export const frozenEmailPayloadSchema = z.object({
  from: header,
  to: z.email(),
  subject: header,
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.email().optional(),
}).strict();

export interface FrozenEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export function parseFrozenEmailPayload(value: unknown): FrozenEmailPayload {
  const parsed = frozenEmailPayloadSchema.parse(value);
  return {
    from: parsed.from, to: parsed.to, subject: parsed.subject, html: parsed.html,
    ...(parsed.text !== undefined ? { text: parsed.text } : {}),
    ...(parsed.replyTo !== undefined ? { replyTo: parsed.replyTo } : {}),
  };
}
export type EmailSubmissionResult =
  | { status: 'accepted'; id: string }
  | { status: 'rejected'; code: string; retryable: boolean; retryAfterMs?: number }
  | { status: 'uncertain'; code: string; canReplay: boolean; retryAfterMs?: number };

/** Resend retains idempotency keys for 24h. Allow time for queue/transport delay. */
export const IDEMPOTENCY_RECOVERY_WINDOW_MS = 23 * 60 * 60 * 1000;
export function canReconcileSubmission(firstSubmissionAt: Date, now: Date): boolean {
  const age = now.getTime() - firstSubmissionAt.getTime();
  return age >= 0 && age < IDEMPOTENCY_RECOVERY_WINDOW_MS;
}

function retryDelay(headers: Record<string, string> | null | undefined): number | undefined {
  const seconds = Number(headers?.['retry-after']);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
  return undefined;
}

/**
 * One attempt only. The caller must persist its exact payload/key before calling.
 * Never fall back to a new key after a timeout or an idempotency conflict.
 * Acceptance means the provider returned an ID, not inbox delivery.
 */
export async function submitFrozenEmail(payload: FrozenEmailPayload, key: string): Promise<EmailSubmissionResult> {
  if (!frozenEmailPayloadSchema.safeParse(payload).success || key.length < 1 || key.length > 256) {
    return { status: 'rejected', code: 'invalid_submission', retryable: false };
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_placeholder_key') {
    return { status: 'rejected', code: 'provider_not_configured', retryable: false };
  }
  try {
    const result = await new Resend(apiKey).emails.send(payload, { idempotencyKey: key });
    if (result.error) {
      const code = result.error.name;
      const delay = retryDelay(result.headers);
      if (code === 'concurrent_idempotent_requests') {
        return { status: 'uncertain', code, canReplay: true, retryAfterMs: delay ?? 60_000 };
      }
      if (code === 'invalid_idempotent_request') {
        return { status: 'uncertain', code, canReplay: false };
      }
      // A server-side failure may have happened after accepting the request.
      if (!result.error.statusCode || result.error.statusCode >= 500) {
        return { status: 'uncertain', code, canReplay: true, retryAfterMs: delay ?? 60_000 };
      }
      return {
        status: 'rejected', code, retryable: result.error.statusCode === 429,
        ...(delay !== undefined ? { retryAfterMs: delay } : {}),
      };
    }
    if (!result.data?.id) return { status: 'uncertain', code: 'missing_provider_id', canReplay: true };
    return { status: 'accepted', id: result.data.id };
  } catch {
    return { status: 'uncertain', code: 'transport_error', canReplay: true, retryAfterMs: 60_000 };
  }
}

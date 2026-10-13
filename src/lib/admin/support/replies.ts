import { createHash } from 'crypto';
import { Prisma, type support_reply_operations, type SupportTicketStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { canReconcileSubmission, parseFrozenEmailPayload, submitFrozenEmail, type FrozenEmailPayload } from '@/lib/email/campaign-provider';

export const supportStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const replyInputSchema = z.object({
  requestKey: z.uuid(),
  message: z.string().trim().min(1).max(20_000),
  expectedUserId: z.string().min(1).max(200),
  expectedRecipient: z.email().transform(value => value.toLowerCase().trim()),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  updateStatus: z.enum(supportStatuses).optional(),
}).strict();
export type ReplyInput = z.infer<typeof replyInputSchema>;
export class SupportError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/** Preserve this area's existing stored-role check, rather than trusting UI state. */
export async function requireSupportAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new SupportError(401, 'Unauthorized');
  const user = await db.users.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'ADMIN') throw new SupportError(403, 'Admin access required');
  return session.user.id;
}

export function nextTicketVersion(previous: Date, now = new Date()) {
  return new Date(Math.max(now.getTime(), previous.getTime() + 1));
}
export function statusFields(status: SupportTicketStatus, now: Date) {
  return { status, resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? now : null };
}
export const ticketUserInclude = { users: { select: { id: true, email: true, username: true, display_name: true } } } as const;

export function escapeSupportText(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
export function replyHash(ticketId: string, actorId: string, input: ReplyInput) {
  return createHash('sha256').update(JSON.stringify({ ticketId, actorId, message: input.message,
    userId: input.expectedUserId, recipient: input.expectedRecipient, version: input.expectedUpdatedAt,
    updateStatus: input.updateStatus ?? null })).digest('hex');
}

export function buildSupportPayload(ticket: { type: string; category: string; subject: string | null; message: string; users: { email: string; display_name: string } }, message: string): FrozenEmailPayload {
  const kind = ticket.type === 'ISSUE' ? 'Issue Report' : 'Suggestion';
  const subject = `Re: Your ${kind} - ${ticket.category.replace(/[\r\n]+/g, ' ')}`;
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #9C060B;">Voiceover Studio Finder Support</h2>
    <p>Hi ${escapeSupportText(ticket.users.display_name)},</p>
    <p>Thank you for your ${ticket.type === 'ISSUE' ? 'issue report' : 'suggestion'}. We have reviewed it and wanted to get back to you:</p>
    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #9C060B; margin: 20px 0;">${escapeSupportText(message).replace(/\n/g, '<br>')}</div>
    <p style="font-size: 12px; color: #666;"><strong>Original ${kind}:</strong><br>
    <strong>Category:</strong> ${escapeSupportText(ticket.category)}<br>
    ${ticket.subject ? `<strong>Subject:</strong> ${escapeSupportText(ticket.subject)}<br>` : ''}
    <strong>Message:</strong> ${escapeSupportText(ticket.message)}</p>
    <hr><p>If you have further questions, please reply to this email.<br>The Voiceover Studio Finder Team</p></div>`;
  return parseFrozenEmailPayload({
    from: process.env.RESEND_FROM_EMAIL || 'support@voiceoverstudiofinder.com',
    to: ticket.users.email.toLowerCase().trim(), subject, html,
    text: `Hi ${ticket.users.display_name},\n\n${message}\n\nOriginal ${kind}: ${ticket.category}\n${ticket.message}\n\nThe Voiceover Studio Finder Team`,
    ...(process.env.RESEND_REPLY_TO_EMAIL ? { replyTo: process.env.RESEND_REPLY_TO_EMAIL } : {}),
  });
}

export async function getReplyOperation(ticketId: string, operationId: string) {
  const operation = await db.support_reply_operations.findUnique({ where: { id: operationId } });
  if (!operation || operation.ticket_id !== ticketId) throw new SupportError(404, 'Reply operation not found');
  return operation;
}

export async function prepareReply(ticketId: string, actorId: string, input: ReplyInput) {
  const hash = replyHash(ticketId, actorId, input);
  const existing = await db.support_reply_operations.findUnique({ where: { id: input.requestKey } });
  if (existing) {
    if (existing.ticket_id !== ticketId || existing.payload_hash !== hash) throw new SupportError(409, 'This request key already belongs to a different reply');
    return existing;
  }
  try {
    return await db.$transaction(async tx => {
      // Serialize review validation with ticket updates/deletion, and recheck a
      // duplicate key after the lock before returning a definitive rejection.
      await tx.$queryRaw`SELECT id FROM support_tickets WHERE id = ${ticketId} FOR UPDATE`;
      const raced = await tx.support_reply_operations.findUnique({ where: { id: input.requestKey } });
      if (raced) {
        if (raced.ticket_id !== ticketId || raced.payload_hash !== hash) throw new SupportError(409, 'This request key already belongs to a different reply');
        return raced;
      }
      const ticket = await tx.support_tickets.findUnique({ where: { id: ticketId }, include: ticketUserInclude });
      if (!ticket) throw new SupportError(404, 'Suggestion not found');
      if (ticket.user_id !== input.expectedUserId || ticket.users.email.toLowerCase().trim() !== input.expectedRecipient
          || ticket.updated_at.toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) {
        throw new SupportError(409, 'The suggestion or recipient changed. Refresh it and review the reply before sending.');
      }
      const payload = buildSupportPayload(ticket, input.message);
      return tx.support_reply_operations.create({ data: {
        id: input.requestKey, ticket_id: ticketId, ticket_user_id: ticket.user_id, actor_id: actorId,
        recipient: payload.to, message: input.message, payload_hash: hash, payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonObject,
        requested_status: input.updateStatus ?? null, ticket_version: ticket.updated_at,
        provider_key: `support-reply/${input.requestKey}`, status_result: input.updateStatus ? 'PENDING' : 'NOT_REQUESTED',
      } });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const raced = await getReplyOperation(ticketId, input.requestKey);
    if (raced.payload_hash !== hash) throw new SupportError(409, 'This request key already belongs to a different reply');
    return raced;
  }
}

/** This recovery never calls the provider, including after a later admin reopening. */
export async function recoverReplyStatus(operationId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM support_reply_operations WHERE id = ${operationId} FOR UPDATE`;
    const op = await tx.support_reply_operations.findUniqueOrThrow({ where: { id: operationId } });
    if (op.provider_status !== 'ACCEPTED') throw new SupportError(409, 'Provider acceptance has not been confirmed');
    if (!op.requested_status || !['PENDING', 'FAILED'].includes(op.status_result)) return op;
    const now = nextTicketVersion(op.ticket_version);
    const updated = await tx.support_tickets.updateMany({
      where: { id: op.ticket_id, user_id: op.ticket_user_id, updated_at: op.ticket_version },
      data: { ...statusFields(op.requested_status, now), updated_at: now },
    });
    const exists = updated.count ? true : !!await tx.support_tickets.findUnique({ where: { id: op.ticket_id }, select: { id: true } });
    return tx.support_reply_operations.update({ where: { id: op.id }, data: {
      status_result: updated.count ? 'APPLIED' : exists ? 'CONFLICT' : 'TICKET_MISSING',
    } });
  });
}

const LEASE_MS = 60_000;
export async function dispatchReply(operation: support_reply_operations, now = new Date()) {
  if (operation.provider_status === 'ACCEPTED') return recoverReplyStatus(operation.id);
  if (['REJECTED', 'REVIEW_REQUIRED'].includes(operation.provider_status)) return operation;
  if (operation.lease_until && operation.lease_until > now) return operation;
  if (operation.first_attempt_at && !canReconcileSubmission(operation.first_attempt_at, now)) {
    await db.support_reply_operations.updateMany({ where: { id: operation.id, provider_status: operation.provider_status, updated_at: operation.updated_at }, data: {
      provider_status: 'REVIEW_REQUIRED', error_code: 'idempotency_window_expired', lease_until: null,
    } });
    return getReplyOperation(operation.ticket_id, operation.id);
  }
  // Only before the first possible submission: do not retarget an uncertain send.
  if (!operation.first_attempt_at) {
    const ticket = await db.support_tickets.findUnique({ where: { id: operation.ticket_id }, include: ticketUserInclude });
    if (!ticket || ticket.user_id !== operation.ticket_user_id || ticket.users.email.toLowerCase().trim() !== operation.recipient
        || ticket.updated_at.getTime() !== operation.ticket_version.getTime()) {
      await db.support_reply_operations.updateMany({ where: { id: operation.id, provider_status: 'PREPARED', updated_at: operation.updated_at }, data: {
        provider_status: 'REJECTED', error_code: 'recipient_or_ticket_changed', lease_until: null,
      } });
      return getReplyOperation(operation.ticket_id, operation.id);
    }
  }
  const leaseUntil = new Date(now.getTime() + LEASE_MS);
  const claim = await db.support_reply_operations.updateMany({
    where: { id: operation.id, provider_status: operation.provider_status, updated_at: operation.updated_at,
      OR: [{ lease_until: null }, { lease_until: { lte: now } }] },
    data: { provider_status: 'SUBMITTING', first_attempt_at: operation.first_attempt_at ?? now,
      lease_until: leaseUntil, attempt_count: { increment: 1 } },
  });
  if (!claim.count) return getReplyOperation(operation.ticket_id, operation.id);
  const payload = parseFrozenEmailPayload(operation.payload);
  const outcome = await submitFrozenEmail(payload, operation.provider_key);
  // Lease comparison prevents an older failure from replacing a newer result.
  const owned = { id: operation.id, provider_status: 'SUBMITTING', lease_until: leaseUntil };
  if (outcome.status === 'accepted') {
    await db.support_reply_operations.updateMany({ where: owned, data: {
      provider_status: 'ACCEPTED', provider_message_id: outcome.id, accepted_at: new Date(), lease_until: null, error_code: null,
    } });
    const accepted = await getReplyOperation(operation.ticket_id, operation.id);
    if (accepted.provider_status !== 'ACCEPTED') return accepted;
    try { return await recoverReplyStatus(operation.id); }
    catch {
      // Accepted email and pending ticket status are independent recovery states.
      await db.support_reply_operations.updateMany({ where: { id: operation.id, status_result: 'PENDING' }, data: { status_result: 'FAILED' } });
      return getReplyOperation(operation.ticket_id, operation.id);
    }
  }
  await db.support_reply_operations.updateMany({ where: owned, data: {
    provider_status: outcome.status === 'rejected' ? 'REJECTED' : outcome.canReplay ? 'UNKNOWN' : 'REVIEW_REQUIRED',
    error_code: outcome.code,
    lease_until: outcome.status === 'uncertain' && outcome.canReplay ? new Date(Date.now() + (outcome.retryAfterMs ?? LEASE_MS)) : null,
  } });
  return getReplyOperation(operation.ticket_id, operation.id);
}

export function replyOperationDto(op: support_reply_operations, now = new Date()) {
  return { id: op.id, ticketId: op.ticket_id, recipient: op.recipient, message: op.message,
    providerStatus: op.provider_status, providerId: op.provider_message_id, statusResult: op.status_result,
    requestedStatus: op.requested_status, createdAt: op.created_at.toISOString(),
    canRecover: ['PREPARED', 'SUBMITTING', 'UNKNOWN'].includes(op.provider_status)
      && (!op.first_attempt_at || canReconcileSubmission(op.first_attempt_at, now)),
    retryAt: op.lease_until?.toISOString() ?? null,
  };
}

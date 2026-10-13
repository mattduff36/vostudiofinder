import { Prisma, type refund_operations } from '@prisma/client';
import { db } from '@/lib/db';
import { canReconcileSubmission, parseFrozenEmailPayload, submitFrozenEmail } from '@/lib/email/campaign-provider';
import { freezeTemplateSender, loadResolvedTemplate } from '@/lib/email/template-store';
import { renderResolvedEmailTemplate } from '@/lib/email/render';
import { claimOperation, getRefundOperation, releaseOperation } from './service';
import { refundLifecycleEnabled } from './contracts';

export function refundOutcomeCopy(operation: Pick<refund_operations, 'benefit_action' | 'benefit_status' | 'billing_action' | 'billing_status' | 'billing_effective_at'>) {
  const benefitOutcome = operation.benefit_status === 'NOT_APPLICABLE' ? 'This partial refund does not change your purchased benefits.'
    : operation.benefit_status !== 'APPLIED' ? 'The purchased benefit needs a separate review. No completed benefit change is confirmed by this email.'
    : operation.benefit_action === 'KEEP' ? 'Your purchased benefit has been kept.'
    : 'Only the benefit linked to this purchase was ended. Other surviving benefits and existing profile visibility holds are preserved.';
  const billingOutcome = operation.billing_status === 'NOT_APPLICABLE' ? 'This refund did not change any renewal settings.'
    : operation.billing_status !== 'APPLIED' ? 'Renewal settings need a separate review. A cancellation is not confirmed by this email.'
    : operation.billing_action === 'KEEP' ? 'Your renewal settings were kept unchanged.'
    : `Renewal is cancelled, or scheduled to stop at the confirmed period end${operation.billing_effective_at ? ` (${operation.billing_effective_at.toLocaleDateString('en-GB', { timeZone: 'UTC' })})` : ''}.`;
  return { benefitOutcome, billingOutcome };
}

/** Notification recovery is independent of money, access and future billing. */
export async function dispatchRefundNotification(id: string) {
  if (!refundLifecycleEnabled() || process.env.REFUND_NOTIFICATIONS_ENABLED !== 'true') return getRefundOperation(id);
  const first = await getRefundOperation(id);
  if (first.source !== 'ADMIN' || !['PENDING', 'SUBMITTING', 'UNKNOWN', 'RETRY'].includes(first.notification_status)) return first;
  const token = await claimOperation(id);
  try {
    let operation = await getRefundOperation(id);
    if (operation.money_status !== 'SUCCEEDED') {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { notification_status: 'REVIEW' } });
      return getRefundOperation(id);
    }
    if (operation.notification_submitted_at && !canReconcileSubmission(operation.notification_submitted_at, new Date())) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { notification_status: 'REVIEW', last_error_code: 'NOTIFICATION_REPLAY_WINDOW_EXPIRED' } });
      return getRefundOperation(id);
    }
    // Freeze content, recipient and sender once. Later template edits or effect recovery
    // cannot change a submitted message behind its provider idempotency key.
    if (!operation.notification_snapshot) {
      await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${operation.user_reference} FOR UPDATE`;
        const current = await tx.refund_operations.findUnique({ where: { id }, include: { payment: { include: { users: true } } } });
        if (!current || current.lease_token !== token) return;
        const user = current.payment?.users;
        if (!current.payment || !user || user.deletion_status !== 'ACTIVE' || user.deletion_requested_at || user.deletion_scheduled_for) {
          await tx.refund_operations.update({ where: { id }, data: { notification_status: 'REVIEW', last_error_code: 'NOTIFICATION_RECIPIENT_UNAVAILABLE' } });
          return;
        }
        const template = freezeTemplateSender(await loadResolvedTemplate('refund-processed', tx));
        const variables = {
          displayName: user.display_name || user.username, refundAmount: (current.amount / 100).toFixed(2), currency: current.currency.toUpperCase(),
          paymentAmount: (current.payment.amount / 100).toFixed(2), refundType: current.benefit_action ? 'full (including earlier refunds)' : 'partial',
          isFullRefund: current.benefit_action ? 'yes' : 'no', comment: current.comment || '',
          refundDate: new Date().toLocaleDateString('en-GB', { timeZone: 'UTC' }), ...refundOutcomeCopy(current),
        };
        // Old stored overrides are retained, but always append the independently
        // derived outcome paragraphs if that override does not render them itself.
        const copy = { ...template, bodyParagraphs: [...template.bodyParagraphs,
          ...(!template.bodyParagraphs.some(p => p.includes('{{benefitOutcome}}')) ? ['{{benefitOutcome}}'] : []),
          ...(!template.bodyParagraphs.some(p => p.includes('{{billingOutcome}}')) ? ['{{billingOutcome}}'] : []),
        ] };
        const rendered = renderResolvedEmailTemplate(copy, variables);
        const payload = parseFrozenEmailPayload({ to: user.email, from: template.fromName ? `${template.fromName} <${template.fromEmail}>` : template.fromEmail,
          subject: rendered.subject, html: rendered.html, text: rendered.text, ...(template.replyToEmail ? { replyTo: template.replyToEmail } : {}) });
        await tx.refund_operations.update({ where: { id }, data: { notification_snapshot: JSON.parse(JSON.stringify({ payload, templateRevision: template.revision, variables })) as Prisma.InputJsonValue } });
      });
      operation = await getRefundOperation(id);
      if (!operation.notification_snapshot) return operation;
    }
    const snapshot = operation.notification_snapshot as Prisma.JsonObject;
    const payload = parseFrozenEmailPayload(snapshot.payload);
    // Recheck the frozen recipient immediately before an undispatched submission.
    const user = await db.users.findUnique({ where: { id: operation.user_reference }, select: { email: true, deletion_status: true, deletion_requested_at: true, deletion_scheduled_for: true } });
    if (!user || user.email !== payload.to || user.deletion_status !== 'ACTIVE' || user.deletion_requested_at || user.deletion_scheduled_for) {
      await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: { notification_status: 'REVIEW', last_error_code: 'NOTIFICATION_RECIPIENT_CHANGED' } });
      return getRefundOperation(id);
    }
    await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: {
      notification_status: 'SUBMITTING', notification_submitted_at: operation.notification_submitted_at ?? new Date(),
    } });
    const result = await submitFrozenEmail(payload, `refund-notification/${id}`);
    await db.refund_operations.updateMany({ where: { id, lease_token: token }, data: result.status === 'accepted'
      ? { notification_status: 'ACCEPTED', notification_provider_id: result.id }
      : { notification_status: result.status === 'uncertain' ? (result.canReplay ? 'UNKNOWN' : 'REVIEW') : result.retryable ? 'RETRY' : 'REJECTED',
        last_error_code: `NOTIFICATION_${result.code}` } });
    return getRefundOperation(id);
  } finally { await releaseOperation(id, token); }
}

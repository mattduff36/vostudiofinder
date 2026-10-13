'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { parseRefundAmount } from '@/lib/admin/payments/contracts';
import { refundRequestSchema, type RefundEligibility, type RefundOperationSummary, type RefundRequest } from '@/lib/payments/refunds/contracts';

interface Props { paymentId: string; onPersisted?: (operation: RefundOperationSummary) => void | Promise<void>; onCancel: () => void }
interface Recovery { request: RefundRequest; operationId?: string }

export function RefundForm(props: Props) { return <RefundFormForPayment key={props.paymentId} {...props} />; }

function RefundFormForPayment({ paymentId, onPersisted, onCancel }: Props) {
  const id = useId();
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<RefundRequest['reason'] | ''>('');
  const [comment, setComment] = useState('');
  const [benefitAction, setBenefitAction] = useState<RefundRequest['benefitAction']>();
  const [billingAction, setBillingAction] = useState<RefundRequest['billingAction']>();
  const [operation, setOperation] = useState<RefundOperationSummary | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const storageKey = `admin-refund-operation/${paymentId}`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/admin/payments/${paymentId}/refund`, signal ? { signal } : undefined);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Unable to load refund details');
    if (!signal?.aborted) setEligibility(body);
  }, [paymentId]);
  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load refund details'); });
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const value = JSON.parse(saved) as Record<string, unknown>;
        const request = refundRequestSchema.safeParse(value.request);
        if (value.version === 1 && request.success && (value.operationId === undefined || typeof value.operationId === 'string')) {
          setRecovery({ request: request.data, ...(typeof value.operationId === 'string' ? { operationId: value.operationId } : {}) });
        } else setError('The local recovery record cannot be read. Inspect the existing server operations before making another refund.');
      }
    } catch { /* Server operation discovery remains available if storage is unavailable. */ }
    return () => controller.abort();
  }, [refresh, storageKey]);
  const persistRecovery = (value: Recovery) => {
    setRecovery(value);
    try { sessionStorage.setItem(storageKey, JSON.stringify({ version: 1, ...value })); } catch { /* Server holds still block competing requests. */ }
  };
  const accept = async (result: RefundOperationSummary) => {
    setOperation(result);
    if (recovery) persistRecovery({ ...recovery, operationId: result.id });
    await onPersisted?.(result);
  };
  const submit = async (saved?: Recovery) => {
    if (inFlight.current) return;
    const minorAmount = parseRefundAmount(amount);
    if (!saved && (!eligibility?.enabled || !minorAmount || !reason)) { setError('Enter an amount and choose a reason.'); return; }
    inFlight.current = true; setPending(true); setError('');
    const request: RefundRequest = saved?.request ?? {
      requestKey: crypto.randomUUID(), amount: minorAmount!, reason: reason as RefundRequest['reason'], comment,
      previewToken: eligibility!.previewToken,
      ...(isFull ? { benefitAction, ...(benefitAction === 'END' ? { benefitGrantId: eligibility!.benefit?.id } : {}), ...(eligibility!.billing ? { billingAction } : {}) } : {}),
    };
    const record = { request, ...(saved?.operationId ? { operationId: saved.operationId } : {}) };
    persistRecovery(record);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/refund`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
      const body = await response.json();
      if (body.operationId) persistRecovery({ request, operationId: body.operationId });
      if (!response.ok) {
        if (!body.operationId && [400, 403, 404, 409].includes(response.status)) {
          setRecovery(null); try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage */ }
        }
        throw new Error(body.error ?? 'Refund outcome is unknown. Recover the saved operation.');
      }
      persistRecovery({ request, operationId: body.operation.id });
      await accept(body.operation);
    } catch (err) { setError(err instanceof Error ? err.message : 'Refund outcome needs reconciliation.'); }
    finally { inFlight.current = false; setPending(false); }
  };
  const recover = async (action?: 'reconcile_money' | 'apply_benefit' | 'reconcile_billing' | 'reconcile_notification') => {
    const operationId = operation?.id ?? recovery?.operationId;
    if (!operationId) { if (recovery) await submit(recovery); return; }
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError('');
    try {
      const response = await fetch(`/api/admin/refund-operations/${operationId}`, action
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) } : undefined);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Unable to recover this operation');
      await accept(body.operation);
    } catch (err) { setError(err instanceof Error ? err.message : 'Recovery failed'); }
    finally { inFlight.current = false; setPending(false); }
  };
  const minor = parseRefundAmount(amount);
  const isFull = !!eligibility && minor !== null && minor + eligibility.settledAmount === eligibility.amount;
  const field = 'w-full rounded border border-gray-300 p-2 text-sm';
  return <div className="space-y-3 border-t border-gray-200 pt-3" aria-busy={pending}>
    {error && <div><p role="alert" className="text-sm text-red-700">{error}</p>{!pending && !operation && !recovery && <Button size="sm" variant="outline" onClick={() => { setError(''); refresh().catch(err => setError(err instanceof Error ? err.message : 'Unable to load details')); }}>Retry loading</Button>}</div>}
    {!eligibility && !error && <p role="status">Loading refund details…</p>}
    {recovery && !operation && <div className="rounded bg-amber-50 p-3 text-sm"><p>{pending ? 'Submitting or reconciling this refund…' : 'A saved refund request needs an outcome check before another request can be made.'}</p><Button size="sm" disabled={pending} onClick={() => recover()}>Recover existing operation</Button></div>}
    {operation && <div className="space-y-2 rounded bg-gray-50 p-3 text-sm" role="status">
      <p className="font-semibold">Refund operation {operation.id}</p>
      <p>Money: {operation.moneyStatus.replaceAll('_', ' ')}{operation.providerStatus ? ` (${operation.providerStatus})` : ''}</p>
      <p>Purchased benefit: {operation.benefitStatus.replaceAll('_', ' ')}</p><p>Future billing: {operation.billingStatus.replaceAll('_', ' ')}</p>
      <p>Notification: {operation.notificationStatus.replaceAll('_', ' ')}</p>
      {operation.accessReviewRequired && <p>Access consequences require review. Existing visibility holds remain in place.</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => recover('reconcile_money')}>Reconcile money</Button>
        {['PENDING', 'SUBMITTING', 'UNKNOWN', 'RETRY'].includes(operation.notificationStatus) && <Button size="sm" variant="outline" disabled={pending} onClick={() => recover('reconcile_notification')}>Reconcile notification</Button>}
        {operation.benefitStatus === 'PENDING' && <Button size="sm" variant="outline" disabled={pending} onClick={() => recover('apply_benefit')}>Retry benefit update</Button>}
        {['PENDING', 'UNKNOWN', 'SUBMITTING'].includes(operation.billingStatus) && <Button size="sm" variant="outline" disabled={pending} onClick={() => recover('reconcile_billing')}>Reconcile renewal</Button>}
      </div>
      {['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(operation.moneyStatus) && <Button size="sm" variant="outline" disabled={pending} onClick={() => { setOperation(null); setRecovery(null); setAmount(''); setBenefitAction(undefined); setBillingAction(undefined); try { sessionStorage.removeItem(storageKey); } catch {} refresh().catch(() => setError('Unable to refresh eligibility')); }}>Review another refund</Button>}
    </div>}
    {eligibility && !recovery && !operation && <>
      {eligibility.operations.length > 0 && <div className="space-y-1 text-sm"><p className="font-medium">Existing refund operations</p>{eligibility.operations.map(item => <button key={item.id} className="block text-left text-blue-700 underline" disabled={pending} onClick={() => setOperation(item)}>{item.id}: {item.moneyStatus.replaceAll('_', ' ')}</button>)}</div>}
      <p className="text-sm">{eligibility.packageLabel}. Available: {(eligibility.availableAmount / 100).toFixed(2)} {eligibility.currency.toUpperCase()}.</p>
      {!eligibility.enabled && <p role="status" className="text-sm text-amber-800">{eligibility.reason}</p>}
      {eligibility.recoveryEnabled && !eligibility.enabled && <Button size="sm" variant="outline" disabled={pending} onClick={async () => {
        if (inFlight.current) return; inFlight.current = true; setPending(true); setError('');
        try { const response = await fetch(`/api/admin/payments/${paymentId}/refund`, { method: 'PATCH' }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Reconciliation failed'); await refresh(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Reconciliation failed'); }
        finally { inFlight.current = false; setPending(false); }
      }}>Reconcile recorded provider refunds</Button>}
      {eligibility.enabled && <fieldset disabled={pending} className="space-y-3">
        <div><label htmlFor={`${id}-amount`} className="block text-sm">Refund amount ({eligibility.currency.toUpperCase()})</label><input id={`${id}-amount`} className={field} inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); setBenefitAction(undefined); setBillingAction(undefined); }} /></div>
        <div><label htmlFor={`${id}-reason`} className="block text-sm">Reason</label><select id={`${id}-reason`} className={field} value={reason} onChange={event => setReason(event.target.value as typeof reason)}><option value="">Choose a reason</option><option value="requested_by_customer">Requested by customer</option><option value="duplicate">Duplicate payment</option><option value="fraudulent">Fraudulent payment</option></select></div>
        <div><label htmlFor={`${id}-comment`} className="block text-sm">Comment (optional)</label><textarea id={`${id}-comment`} className={field} maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} /></div>
        {isFull && <>
          <p className="text-sm">This completes a full refund, including earlier settled refunds.</p>
          <div><label htmlFor={`${id}-benefit`} className="block text-sm">Purchased benefit</label><select id={`${id}-benefit`} className={field} value={benefitAction ?? ''} onChange={event => setBenefitAction(event.target.value as RefundRequest['benefitAction'])}><option value="">Choose what happens to access</option><option value="KEEP">Keep access</option><option value="END" disabled={!eligibility.benefit?.canEnd}>End only the linked purchased benefit</option></select></div>
          {eligibility.benefit ? <p className="text-xs">{eligibility.benefit.kind}: {new Date(eligibility.benefit.startsAt).toLocaleDateString('en-GB')}–{new Date(eligibility.benefit.endsAt).toLocaleDateString('en-GB')}. Other surviving grants and existing visibility holds are preserved.</p> : <p className="text-xs">Historic purchase attribution is unknown. Automatic benefit ending is unavailable.</p>}
          {eligibility.billing && <div className="space-y-2"><p className="text-xs">Subscription {eligibility.billing.subscriptionId}. {eligibility.billing.nextChargeAt ? `Next known renewal: ${new Date(eligibility.billing.nextChargeAt).toLocaleDateString('en-GB')}; charge amount not confirmed here.` : 'No next charge is currently confirmed.'}</p><label htmlFor={`${id}-billing`} className="block text-sm">Future billing (separate choice)</label><select id={`${id}-billing`} className={field} value={billingAction ?? ''} onChange={event => setBillingAction(event.target.value as RefundRequest['billingAction'])} disabled={eligibility.billing.state !== 'KNOWN'}><option value="">Choose what happens to renewal</option><option value="KEEP">Keep current renewal settings</option><option value="CANCEL_AT_PERIOD_END">Cancel renewal at the confirmed period end</option></select>{eligibility.billing.state !== 'KNOWN' && <p className="text-red-700 text-sm">Billing state requires review before a full refund.</p>}</div>}
        </>}
        <Button size="sm" onClick={() => submit()} disabled={!minor || !reason || minor > eligibility.availableAmount || (isFull && (!benefitAction || (!!eligibility.billing && (!billingAction || eligibility.billing.state !== 'KNOWN'))))}>Confirm refund</Button>
      </fieldset>}
    </>}
    <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>{operation || recovery ? 'Close' : 'Cancel'}</Button>
  </div>;
}

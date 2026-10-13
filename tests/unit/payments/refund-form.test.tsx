import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RefundForm } from '@/components/admin/payments/RefundForm';
import type { RefundEligibility } from '@/lib/payments/refunds/contracts';
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const eligibility: RefundEligibility = { enabled: true, recoveryEnabled: true, reason: null, paymentId: 'payment-a', currency: 'gbp', amount: 3000, settledAmount: 1000, heldAmount: 0, availableAmount: 2000, packageLabel: 'Premium', previewToken: 'preview', operations: [],
  benefit: { id: 'grant-a', kind: 'PREMIUM', startsAt: '2026-01-01', endsAt: '2027-01-01', canEnd: true },
  billing: { subscriptionId: 'sub-a', state: 'KNOWN', cancelAtPeriodEnd: false, periodEnd: '2027-01-01', nextChargeAt: '2027-01-01', nextChargeAmount: null, currency: 'gbp' } };
const operation = { id: 'operation-a', paymentId: 'payment-a', amount: 2000, currency: 'gbp', moneyStatus: 'UNKNOWN', providerStatus: null, benefitStatus: 'PENDING', billingStatus: 'PENDING', notificationStatus: 'NOT_REQUESTED', accessReviewRequired: false, errorCode: null };
let fetcher: jest.Mock;
beforeEach(() => { sessionStorage.clear(); fetcher = jest.fn(); global.fetch = fetcher; });
it('full cumulative refunds have no default access or renewal choice, and double submit uses one frozen request', async () => {
  fetcher.mockResolvedValueOnce(response(eligibility));
  let finish!: (value: ReturnType<typeof response>) => void;
  fetcher.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<RefundForm paymentId="payment-a" onCancel={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText('Refund amount (GBP)'), { target: { value: '20.00' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'requested_by_customer' } });
  expect(screen.getByLabelText('Purchased benefit')).toHaveValue(''); expect(screen.getByLabelText('Future billing (separate choice)')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Confirm refund' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Purchased benefit'), { target: { value: 'KEEP' } });
  expect(screen.getByRole('button', { name: 'Confirm refund' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Future billing (separate choice)'), { target: { value: 'KEEP' } });
  const confirm = screen.getByRole('button', { name: 'Confirm refund' }); fireEvent.click(confirm); fireEvent.click(confirm);
  expect(fetcher.mock.calls.filter(call => call[1]?.method === 'POST')).toHaveLength(1);
  const submitted = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(submitted).toMatchObject({ amount: 2000, benefitAction: 'KEEP', billingAction: 'KEEP' });
  expect(JSON.parse(sessionStorage.getItem('admin-refund-operation/payment-a')!).request.requestKey).toBe(submitted.requestKey);
  await act(async () => { finish(response({ operation })); });
  expect(screen.getByText(/Money: UNKNOWN/)).toBeInTheDocument();
});
it('existing operations remain discoverable without browser storage and notification recovery cannot post a new refund', async () => {
  const pending = { ...operation, moneyStatus: 'SUCCEEDED', benefitStatus: 'APPLIED', billingStatus: 'APPLIED', notificationStatus: 'UNKNOWN' };
  fetcher.mockResolvedValueOnce(response({ ...eligibility, enabled: false, reason: 'No remaining balance', operations: [pending] }));
  fetcher.mockResolvedValueOnce(response({ operation: { ...pending, notificationStatus: 'ACCEPTED' } }));
  render(<RefundForm paymentId="payment-a" onCancel={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: /operation-a: SUCCEEDED/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Reconcile notification' }));
  await waitFor(() => expect(screen.getByText('Notification: ACCEPTED')).toBeInTheDocument());
  expect(fetcher.mock.calls[1][0]).toBe('/api/admin/refund-operations/operation-a');
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ action: 'reconcile_notification' });
});

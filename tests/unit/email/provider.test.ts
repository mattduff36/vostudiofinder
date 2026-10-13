/** @jest-environment node */
const mockSend = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn(() => ({ emails: { send: mockSend } })) }));
import { submitFrozenEmail, canReconcileSubmission, IDEMPOTENCY_RECOVERY_WINDOW_MS } from '@/lib/email/campaign-provider';

const payload = { from: 'Studio <sender@example.invalid>', to: 'recipient@example.invalid', subject: 'Reviewed email', html: '<p>Frozen copy</p>', text: 'Frozen copy' };
beforeEach(() => { mockSend.mockReset(); process.env.RESEND_API_KEY = 're_mock_only'; });

test('acceptance requires a provider ID and sends the exact frozen payload with the same key', async () => {
  mockSend.mockResolvedValue({ data: { id: 'accepted-1' }, error: null, headers: null });
  await expect(submitFrozenEmail(payload, 'campaign/delivery-1/1')).resolves.toEqual({ status: 'accepted', id: 'accepted-1' });
  expect(mockSend).toHaveBeenCalledWith(payload, { idempotencyKey: 'campaign/delivery-1/1' });
  mockSend.mockResolvedValue({ data: {}, error: null, headers: null });
  await expect(submitFrozenEmail(payload, 'campaign/delivery-1/1')).resolves.toMatchObject({ status: 'uncertain', canReplay: true });
});

test.each([
  ['concurrent_idempotent_requests', 409, 'uncertain', true],
  ['invalid_idempotent_request', 409, 'uncertain', false],
  ['invalid_idempotency_key', 400, 'rejected', false],
  ['rate_limit_exceeded', 429, 'rejected', true],
  ['validation_error', 422, 'rejected', false],
  ['application_error', 500, 'uncertain', true],
])('%s is classified without a fallback send', async (name, statusCode, status, retry) => {
  mockSend.mockResolvedValue({ data: null, error: { name, message: 'Mock failure', statusCode }, headers: { 'retry-after': '180' } });
  const result = await submitFrozenEmail(payload, 'stable-key');
  expect(result.status).toBe(status);
  expect(result.status === 'uncertain' ? result.canReplay : result.status === 'rejected' && result.retryable).toBe(retry);
  expect(mockSend).toHaveBeenCalledTimes(1);
  if (name === 'rate_limit_exceeded') expect(result).toMatchObject({ retryAfterMs: 180_000 });
});

test('transport loss is uncertain and a missing credential never calls the provider', async () => {
  mockSend.mockRejectedValue(new Error('connection closed after submission'));
  await expect(submitFrozenEmail(payload, 'stable-key')).resolves.toMatchObject({ status: 'uncertain', canReplay: true });
  mockSend.mockClear(); delete process.env.RESEND_API_KEY;
  await expect(submitFrozenEmail(payload, 'stable-key')).resolves.toMatchObject({ status: 'rejected', retryable: false });
  expect(mockSend).not.toHaveBeenCalled();
});

test('same-key recovery stops before the 24-hour provider expiry boundary', () => {
  const first = new Date('2026-10-13T00:00:00Z');
  expect(canReconcileSubmission(first, new Date(first.getTime() + IDEMPOTENCY_RECOVERY_WINDOW_MS - 1))).toBe(true);
  expect(canReconcileSubmission(first, new Date(first.getTime() + IDEMPOTENCY_RECOVERY_WINDOW_MS))).toBe(false);
  expect(canReconcileSubmission(first, new Date('2026-10-14T00:00:00Z'))).toBe(false);
  expect(canReconcileSubmission(first, new Date('2026-10-12T23:59:59Z'))).toBe(false);
});

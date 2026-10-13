/** @jest-environment node */
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { submitFrozenEmail } from '@/lib/email/campaign-provider';
import { dispatchReply, prepareReply, recoverReplyStatus, replyHash, replyInputSchema, statusFields, type ReplyInput } from '@/lib/admin/support/replies';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/email/campaign-provider', () => ({ ...jest.requireActual('@/lib/email/campaign-provider'), submitFrozenEmail: jest.fn() }));
jest.mock('@/lib/db', () => ({ db: {
  users: { findUnique: jest.fn() }, support_tickets: { findUnique: jest.fn(), updateMany: jest.fn() },
  support_reply_operations: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  $queryRaw: jest.fn(), $transaction: jest.fn(),
} }));
const database = db as any;
const provider = submitFrozenEmail as jest.Mock;
const date = new Date('2026-10-12T18:00:00.000Z');
const input: ReplyInput = { requestKey: '2de28b4e-129d-4b57-92ab-4452b39b324b', message: 'Hello <script>bad</script>',
  expectedUserId: 'customer-b', expectedRecipient: 'b@example.test', expectedUpdatedAt: date.toISOString(), updateStatus: 'IN_PROGRESS' };
let ticket: any;
let operation: any;
let tick: number;
let failAcceptedWrite: boolean;
let failStatusWrite: boolean;
const copy = <T,>(value: T): T => structuredClone(value);
const isDate = (value: unknown): value is Date => Object.prototype.toString.call(value) === '[object Date]';
function matches(row: any, where: any) {
  if (!row) return false;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') { if (!(value as any[]).some(clause => matches(row, clause))) return false; }
    else if (isDate(value)) { if (!(isDate(row[key])) || row[key].getTime() !== value.getTime()) return false; }
    else if (value && typeof value === 'object') {
      if ('in' in value && !(value as any).in.includes(row[key])) return false;
      if ('lte' in value && !(isDate(row[key]) && row[key] <= (value as any).lte)) return false;
    } else if (row[key] !== value) return false;
  }
  return true;
}
function change(data: any) {
  operation = { ...operation, ...data, attempt_count: data.attempt_count?.increment ? operation.attempt_count + data.attempt_count.increment : operation.attempt_count,
    updated_at: new Date(date.getTime() + ++tick) };
}
beforeEach(() => {
  jest.clearAllMocks(); tick = 0; operation = null; failAcceptedWrite = false; failStatusWrite = false;
  ticket = { id: 'ticket-b', user_id: 'customer-b', status: 'OPEN', updated_at: date, resolved_at: null,
    type: 'SUGGESTION', category: 'A & B', subject: '<b>subject</b>', message: '<img src=x>',
    users: { id: 'customer-b', email: 'b@example.test', display_name: '<script>Name</script>' } };
  database.support_tickets.findUnique.mockImplementation(async () => copy(ticket));
  database.support_tickets.updateMany.mockImplementation(async ({ where, data }: any) => {
    if (failStatusWrite) throw new Error('isolated mocked failure');
    if (!matches(ticket, where)) return { count: 0 };
    ticket = { ...ticket, ...data }; return { count: 1 };
  });
  database.support_reply_operations.findUnique.mockImplementation(async () => copy(operation));
  database.support_reply_operations.findUniqueOrThrow.mockImplementation(async () => copy(operation));
  database.support_reply_operations.create.mockImplementation(async ({ data }: any) => {
    if (operation) throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '6' });
    operation = { ...data, provider_status: 'PREPARED', provider_message_id: null, first_attempt_at: null, lease_until: null,
      attempt_count: 0, error_code: null, accepted_at: null, created_at: date, updated_at: date };
    return copy(operation);
  });
  database.support_reply_operations.update.mockImplementation(async ({ data }: any) => { change(data); return copy(operation); });
  database.support_reply_operations.updateMany.mockImplementation(async ({ where, data }: any) => {
    if (!matches(operation, where)) return { count: 0 };
    if (failAcceptedWrite && data.provider_status === 'ACCEPTED') throw new Error('mocked DB outage after provider acceptance');
    change(data); return { count: 1 };
  });
  database.$queryRaw.mockResolvedValue([]);
  database.$transaction.mockImplementation(async (run: any) => run(database));
  provider.mockResolvedValue({ status: 'accepted', id: 'email-1' });
});

it('validates input and freezes escaped content, recipient, sender and request identity before dispatch', async () => {
  expect(replyInputSchema.safeParse({ ...input, message: 12 }).success).toBe(false);
  const prepared = await prepareReply('ticket-b', 'admin-a', input);
  expect(provider).not.toHaveBeenCalled();
  expect(prepared.recipient).toBe('b@example.test');
  expect(prepared.payload.html).not.toContain('<script>');
  expect(prepared.payload.html).toContain('&lt;img src=x&gt;');
  expect(prepared.payload.html).toContain('A &amp; B');
  expect(prepared.payload_hash).toBe(replyHash('ticket-b', 'admin-a', input));
});
it('rejects a changed recipient or payload for an existing request key', async () => {
  ticket.users.email = 'changed@example.test';
  await expect(prepareReply('ticket-b', 'admin-a', input)).rejects.toMatchObject({ status: 409 });
  ticket.users.email = input.expectedRecipient;
  await prepareReply('ticket-b', 'admin-a', input);
  await expect(prepareReply('ticket-b', 'admin-a', { ...input, message: 'different' })).rejects.toMatchObject({ status: 409 });
  expect(provider).not.toHaveBeenCalled();
});
it('double-client submission creates one durable operation and one active provider attempt', async () => {
  const [a, b] = await Promise.all([prepareReply('ticket-b', 'admin-a', input), prepareReply('ticket-b', 'admin-a', input)]);
  await Promise.all([dispatchReply(a, date), dispatchReply(b, date)]);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(operation.provider_status).toBe('ACCEPTED');
  expect(ticket.status).toBe('IN_PROGRESS');
  expect(operation.status_result).toBe('APPLIED');
});
it('provider rejection never advances ticket status', async () => {
  provider.mockResolvedValue({ status: 'rejected', code: 'validation_error', retryable: false });
  await dispatchReply(await prepareReply('ticket-b', 'admin-a', input), date);
  expect(operation.provider_status).toBe('REJECTED');
  expect(database.support_tickets.updateMany).not.toHaveBeenCalled();
  expect(ticket.status).toBe('OPEN');
});
it('uncertainty keeps the frozen payload/key and stops replay after the bounded window', async () => {
  provider.mockResolvedValue({ status: 'uncertain', code: 'timeout', canReplay: true });
  await dispatchReply(await prepareReply('ticket-b', 'admin-a', input), date);
  const frozen = copy(operation.payload);
  const first = operation.first_attempt_at;
  operation.lease_until = null;
  provider.mockResolvedValue({ status: 'accepted', id: 'same-provider-id' });
  await dispatchReply(copy(operation), new Date(date.getTime() + 120_000));
  expect(provider.mock.calls.map(call => call[1])).toEqual([`support-reply/${input.requestKey}`, `support-reply/${input.requestKey}`]);
  expect(provider.mock.calls[1][0]).toEqual(frozen);
  expect(operation.first_attempt_at).toEqual(first);
  operation.provider_status = 'UNKNOWN'; operation.lease_until = null;
  await dispatchReply(copy(operation), new Date(date.getTime() + 24 * 60 * 60 * 1000));
  expect(operation.provider_status).toBe('REVIEW_REQUIRED'); expect(provider).toHaveBeenCalledTimes(2);
});
it('recovers provider-accepted/DB-failed uncertainty using the same key after reload', async () => {
  failAcceptedWrite = true;
  await expect(dispatchReply(await prepareReply('ticket-b', 'admin-a', input), date)).rejects.toThrow('mocked DB outage');
  expect(operation.provider_status).toBe('SUBMITTING');
  failAcceptedWrite = false;
  await dispatchReply(copy(operation), new Date(date.getTime() + 65_000));
  expect(provider).toHaveBeenCalledTimes(2);
  expect(provider.mock.calls[0]).toEqual(provider.mock.calls[1]);
  expect(operation.provider_message_id).toBe('email-1');
});
it('status-only recovery does not resend, and never overwrites a later admin reopening', async () => {
  failStatusWrite = true;
  await dispatchReply(await prepareReply('ticket-b', 'admin-a', input), date);
  expect(operation.provider_status).toBe('ACCEPTED'); expect(operation.status_result).toBe('FAILED');
  failStatusWrite = false;
  ticket.updated_at = new Date(date.getTime() + 1000); ticket.status = 'OPEN';
  await recoverReplyStatus(operation.id);
  expect(operation.status_result).toBe('CONFLICT'); expect(ticket.status).toBe('OPEN'); expect(provider).toHaveBeenCalledTimes(1);
});
it('does not send a prepared operation after the user has been deleted', async () => {
  const prepared = await prepareReply('ticket-b', 'admin-a', input); ticket = null;
  await dispatchReply(prepared, date);
  expect(operation.provider_status).toBe('REJECTED'); expect(provider).not.toHaveBeenCalled();
});
it('reopening clears resolved_at and versions are distinct', () => {
  expect(statusFields('OPEN', date).resolved_at).toBeNull();
  expect(statusFields('IN_PROGRESS', date).resolved_at).toBeNull();
  expect(statusFields('RESOLVED', date).resolved_at).toEqual(date);
});

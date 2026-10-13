/** @jest-environment node */
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/sentry/route';
import { db } from '@/lib/db';
import { assessSentryHookSignature } from '@/lib/admin/error-log/webhook-signature';

jest.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

jest.mock('@/lib/db', () => ({
  db: {
    error_log_groups: {
      upsert: jest.fn().mockResolvedValue({ id: 'group_1' }),
      update: jest.fn().mockResolvedValue({ id: 'group_1' }),
    },
  },
}));

const SECRET = 'unit-test-webhook-secret';

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');
}

function post(body: string, signature?: string | null) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signature !== null && signature !== undefined) {
    headers.set('sentry-hook-signature', signature);
  }
  return POST(new NextRequest('http://localhost/api/webhooks/sentry', { method: 'POST', headers, body }));
}

const signedFixture = {
  action: 'created',
  data: {
    issue: {
      id: 99,
      title: 'Boom',
      level: 'error',
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: '2026-01-02T00:00:00.000Z',
      count: '2',
    },
    event: {
      id: 'evt_1',
      message: 'Boom',
      level: 'error',
      timestamp: '2026-01-02T00:00:00.000Z',
      platform: 'node',
      exception: {
        values: [{
          type: 'Error',
          value: 'Boom',
          stacktrace: {
            frames: [{ filename: 'app.ts', function: 'handler', lineno: 10, in_app: true }],
          },
        }],
      },
      request: {
        url: 'https://example.com/path?token=super-secret&page=1',
        method: 'POST',
        headers: [['Authorization', 'Bearer abc'], ['Content-Type', 'application/json']],
        cookies: 'session=abc',
        query_string: [['token', 'super-secret'], ['page', '1']],
        data: { password: 'hunter2', note: 'ok', nested: { api_key: 'k' } },
      },
      user: { id: 'u1', username: 'ada', email: 'ada@example.com', ip_address: '203.0.113.5' },
    },
  },
};

describe('Sentry webhook signature', () => {
  const previousSecret = process.env.SENTRY_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.SENTRY_WEBHOOK_SECRET = SECRET;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.SENTRY_WEBHOOK_SECRET;
    else process.env.SENTRY_WEBHOOK_SECRET = previousSecret;
  });

  it('accepts a signed fixture and stores a redacted sample', async () => {
    const body = JSON.stringify(signedFixture);
    const response = await post(body, sign(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(db.error_log_groups.upsert).toHaveBeenCalledTimes(1);

    const stored = (db.error_log_groups.upsert as jest.Mock).mock.calls[0][0].create.sample_event_json;
    const serialised = JSON.stringify(stored);
    expect(stored.exception.values[0].stacktrace.frames[0]).toMatchObject({
      filename: 'app.ts',
      function: 'handler',
      lineno: 10,
    });
    expect(stored.request.data.password).toBe('[REDACTED]');
    expect(stored.request.data.nested.api_key).toBe('[REDACTED]');
    expect(stored.request.data.note).toBe('ok');
    expect(stored.request.headers).toEqual([['Authorization', '[REDACTED]'], ['Content-Type', 'application/json']]);
    expect(stored.request.cookies).toBe('[REDACTED]');
    expect(stored.request.query_string).toEqual([['token', '[REDACTED]'], ['page', '1']]);
    expect(stored.request.url).toContain('page=1');
    expect(stored.user).toEqual({ id: 'u1', username: 'ada' });
    expect(serialised).not.toContain('super-secret');
    expect(serialised).not.toContain('hunter2');
    expect(serialised).not.toContain('ada@example.com');
    expect(serialised).not.toContain('203.0.113.5');
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'not-a-signature'],
    ['invalid', 'ab'.repeat(32)],
  ] as const)('rejects a %s signature before parsing or persistence', async (kind, signature) => {
    expect(assessSentryHookSignature('not-json', signature, SECRET)).toBe(kind);

    const response = await post('not-json', signature);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Invalid signature');
    expect(db.error_log_groups.upsert).not.toHaveBeenCalled();
    expect(db.error_log_groups.update).not.toHaveBeenCalled();
  });

  it('keeps the missing-config failure ahead of signature checks', async () => {
    delete process.env.SENTRY_WEBHOOK_SECRET;

    const response = await post('not-json', null);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: 'Server misconfigured' });
    expect(db.error_log_groups.upsert).not.toHaveBeenCalled();
    expect(db.error_log_groups.update).not.toHaveBeenCalled();
  });
});

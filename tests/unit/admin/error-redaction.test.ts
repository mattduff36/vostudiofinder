/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/error-log/[id]/route';
import { db } from '@/lib/db';
import { redactSentryEvent } from '@/lib/admin/error-log/redaction';

jest.mock('@/lib/auth-guards', () => ({
  requireApiRole: jest.fn().mockResolvedValue({ user: { role: 'ADMIN' } }),
}));
jest.mock('@/lib/admin/error-log/triage', () => ({ withLocalTriage: jest.fn(async (group: unknown) => group) }));

jest.mock('@/lib/db', () => ({
  db: {
    error_log_groups: {
      findUnique: jest.fn(),
    },
  },
}));

const cachedSample = {
  eventId: 'cached_1',
  exception: {
    values: [{
      type: 'Error',
      value: 'Boom',
      stacktrace: { frames: [{ filename: 'cached.ts', function: 'run', lineno: 4 }] },
    }],
  },
  request: {
    url: 'https://example.com/admin?access_token=cached-token&tab=errors',
    headers: { Authorization: 'Bearer cached', 'Content-Type': 'application/json' },
    cookies: 'sid=1',
    query_string: 'access_token=cached-token&tab=errors',
    data: '{"password":"cached-secret","name":"ada"}',
    body: 'this is not structured',
  },
  contexts: { custom: { region: 'eu', client_secret: 'cached-client' } },
};

describe('Sentry event redaction', () => {
  it('redacts URL credentials and fragments in Referer/Location headers and nested header values', () => {
    const input = { request: { headers: {
      Referer: 'https://name:pass@example.com/reset?token=secret#access_token=fragment-secret',
      Location: '/oauth#/?refresh_token=refresh-secret&tab=ok',
      'X-Debug': { nested: { client_secret: 'nested-secret', route: 'healthy' } },
    } } };
    const output = redactSentryEvent(input);
    for (const secret of ['name:pass', 'fragment-secret', 'refresh-secret', 'nested-secret', 'token=secret']) expect(JSON.stringify(output)).not.toContain(secret);
    expect(output.request.headers['X-Debug'].nested.route).toBe('healthy');
    expect(output.request.headers.Location).toContain('tab=ok');
  });
  it('redacts nested secrets, header pairs, query params and structured bodies', () => {
    const redacted = redactSentryEvent({
      request: {
        url: 'https://example.com/hook?token=live-token&ok=1#frag',
        method: 'POST',
        headers: [['X-Api-Key', 'live-key'], ['Accept', 'application/json']],
        query_string: [['token', 'live-token'], ['ok', '1']],
        data: { profile: { password: 'pw', city: 'London' } },
      },
      breadcrumbs: [{ data: { url: '/reset?token=crumb-token', message: 'clicked' } }],
    });

    expect(redacted.request.url).toBe('https://example.com/hook?token=[REDACTED]&ok=1#frag');
    expect(redacted.request.method).toBe('POST');
    expect(redacted.request.headers).toEqual([['X-Api-Key', '[REDACTED]'], ['Accept', 'application/json']]);
    expect(redacted.request.query_string).toEqual([['token', '[REDACTED]'], ['ok', '1']]);
    expect(redacted.request.data).toEqual({ profile: { password: '[REDACTED]', city: 'London' } });
    expect(redacted.breadcrumbs[0].data.url).toBe('/reset?token=[REDACTED]');
    expect(redacted.breadcrumbs[0].data.message).toBe('clicked');
    expect(JSON.stringify(redacted)).not.toContain('live-token');
    expect(JSON.stringify(redacted)).not.toContain('live-key');
    expect(JSON.stringify(redacted)).not.toContain('crumb-token');
    expect(JSON.stringify(redacted)).not.toContain('pw');
  });

  it('omits unparseable bodies and keeps stack frames', () => {
    const redacted = redactSentryEvent({
      exception: { values: [{ stacktrace: { frames: [{ filename: 'app.ts', function: 'handler' }] } }] },
      request: {
        data: '{"password":',
        body: 'raw unstructured body with token=should-not-leak',
      },
    });

    expect(redacted.exception.values[0].stacktrace.frames[0]).toEqual({
      filename: 'app.ts',
      function: 'handler',
    });
    expect(redacted.request).not.toHaveProperty('data');
    expect(redacted.request).not.toHaveProperty('body');
    expect(JSON.stringify(redacted)).not.toContain('should-not-leak');
  });

  it('applies the same redactor to cached and live admin detail responses', async () => {
    const token = 'unit-test-sentry-auth-token';
    process.env.SENTRY_AUTH_TOKEN = token;
    process.env.SENTRY_ORG_SLUG = 'unit-org';
    process.env.SENTRY_PROJECT_SLUG = 'unit-project';

    (db.error_log_groups.findUnique as jest.Mock).mockResolvedValue({
      id: 'group_1',
      sentry_issue_id: '99',
      title: 'Boom',
      level: 'error',
      status: 'OPEN',
      sample_event_json: cachedSample,
    });

    const liveEvent = {
      eventID: 'live_1',
      exception: { values: [{ stacktrace: { frames: [{ filename: 'live.ts', function: 'fetchLatest' }] } }] },
      request: {
        headers: { cookie: 'live-cookie', accept: 'application/json' },
        data: 'password=live-secret&name=ada',
      },
    };

    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const payload = url.endsWith('/events/latest/') ? liveEvent : { id: '99' };
      return {
        ok: true,
        json: async () => payload,
      } as Response;
    });
    const logs: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map((arg) => String(arg)).join(' '));
    });

    try {
      const response = await GET(
        new NextRequest('http://localhost/api/admin/error-log/group_1?live=1'),
        { params: Promise.resolve({ id: 'group_1' }) },
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.errorLogGroup.sample_event_json.exception.values[0].stacktrace.frames[0].filename).toBe('cached.ts');
      expect(json.errorLogGroup.sample_event_json.request.headers.Authorization).toBe('[REDACTED]');
      expect(json.errorLogGroup.sample_event_json.request.cookies).toBe('[REDACTED]');
      expect(json.errorLogGroup.sample_event_json.request.data).toEqual({ password: '[REDACTED]', name: 'ada' });
      expect(json.errorLogGroup.sample_event_json.request).not.toHaveProperty('body');
      expect(json.errorLogGroup.sample_event_json.contexts.custom.client_secret).toBe('[REDACTED]');
      expect(json.errorLogGroup.sample_event_json.contexts.custom.region).toBe('eu');
      expect(json.sentryLatestEvent.exception.values[0].stacktrace.frames[0].filename).toBe('live.ts');
      expect(json.sentryLatestEvent.request.headers.cookie).toBe('[REDACTED]');
      expect(json.sentryLatestEvent.request.headers.accept).toBe('application/json');
      expect(json.sentryLatestEvent.request.data).toBe('password=[REDACTED]&name=ada');

      const serialised = JSON.stringify(json);
      expect(serialised).not.toContain('cached-token');
      expect(serialised).not.toContain('cached-secret');
      expect(serialised).not.toContain('cached-client');
      expect(serialised).not.toContain('live-cookie');
      expect(serialised).not.toContain('live-secret');
      expect(logs.join('\n')).not.toContain(token);
      expect(logs.join('\n')).not.toContain(token.slice(0, 10));
    } finally {
      fetchMock.mockRestore();
      logSpy.mockRestore();
      delete process.env.SENTRY_AUTH_TOKEN;
      delete process.env.SENTRY_ORG_SLUG;
      delete process.env.SENTRY_PROJECT_SLUG;
    }
  });
});

/** @jest-environment node */
import { db } from '@/lib/db';
import { getAnalyticsDetail, getVisitorSummary } from '@/lib/vercel-analytics';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: { $queryRaw: jest.fn(), $queryRawUnsafe: jest.fn() } }));

const query = db.$queryRaw as jest.Mock;
const breakdown = db.$queryRawUnsafe as jest.Mock;
const now = new Date('2026-10-13T00:00:00.000Z');
const unavailable = { ok: false, error: 'Analytics is temporarily unavailable. Please retry.', configured: true };

beforeEach(() => {
  jest.resetAllMocks();
  query.mockResolvedValue([]);
  breakdown.mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());

it('returns genuine zero traffic while using one upper bound and distinct rolling/calendar lower bounds', async () => {
  expect(await getVisitorSummary(now)).toEqual({
    ok: true,
    data: { visitors24h: 0, visitors7d: 0, pageviews24h: 0, pageviews7d: 0 },
  });
  expect(query.mock.calls.map(call => call.slice(1))).toEqual([
    [new Date('2026-10-12T00:00:00.000Z'), now],
    [new Date('2026-10-07T00:00:00.000Z'), now],
  ]);
  for (const [strings] of query.mock.calls) expect(strings.join('?')).toContain('created_at <');
});

it('keeps database failure distinct from zero traffic and returns no raw provider/database detail', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  query.mockRejectedValueOnce(new Error('private database host and query details'));
  const result = await getVisitorSummary(now);
  expect(result).toEqual(unavailable);
  expect(result).not.toHaveProperty('data');
  expect(JSON.stringify(result)).not.toContain('private database');
});

it('uses the same clock for all detail queries and zero-fills exact chronological UTC dates', async () => {
  const result = await getAnalyticsDetail(now);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected valid empty analytics');
  expect(result.data.timeseries7d).toHaveLength(7);
  expect(result.data.timeseries30d).toHaveLength(30);
  expect(result.data.timeseries7d[0]).toEqual({ date: '2026-10-07', visitors: 0, pageviews: 0 });
  expect(result.data.timeseries7d.at(-1)).toEqual({ date: '2026-10-13', visitors: 0, pageviews: 0 });
  expect(result.data.timeseries30d[0]?.date).toBe('2026-09-14');
  const dates = result.data.timeseries30d.map(point => point.date);
  expect(dates).toEqual([...dates].sort());
  for (const call of query.mock.calls) expect(call.at(-1)).toBe(now);
  expect(breakdown).toHaveBeenCalledTimes(6);
  for (const call of breakdown.mock.calls) {
    expect(call[1]).toEqual(new Date('2026-10-07T00:00:00.000Z'));
    expect(call[2]).toBe(now);
  }
});

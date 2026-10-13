/** @jest-environment node */
import { analyticsRanges, utcDates, fillDailySeries } from '@/lib/analytics/ranges';
import { parseAnalyticsUA } from '@/lib/analytics/user-agent';

it.each(['2026-10-12T23:59:59.999Z', '2026-10-13T00:00:00.000Z'])('uses one clock for rolling hours and exact UTC calendar dates at %s', value => {
  const now = new Date(value), range = analyticsRanges(now);
  expect(now.getTime() - range.rolling24h.getTime()).toBe(86_400_000);
  for (const days of [7, 30]) {
    const dates = utcDates(days, now);
    expect(dates).toHaveLength(days); expect(dates).toEqual([...dates].sort());
    expect(dates.at(-1)).toBe(value.slice(0, 10));
    expect(dates[0]).toBe((days === 7 ? range.days7 : range.days30).toISOString().slice(0, 10));
  }
});
it('zero fills only the requested dates and orders unsorted input', () => {
  const dates = utcDates(7, new Date('2026-10-12T18:00:00Z'));
  const result = fillDailySeries([{ date: dates[6], count: 2 }, { date: '2000-01-01', count: 9 }, { date: dates[0], count: 1 }], dates, date => ({ date, count: 0 }));
  expect(result.map(row => row.count)).toEqual([1, 0, 0, 0, 0, 0, 2]);
});
it.each([
  ['Mozilla iPhone CPU iPhone OS 18_0 like Mac OS X Safari/605', 'iOS', 'Mobile'],
  ['Mozilla Linux; Android 15 Chrome/130 Mobile Safari/537', 'Android', 'Mobile'],
  ['Mozilla iPad CPU OS 18_0 like Mac OS X Safari/605', 'iOS', 'Tablet'],
  ['Mozilla Macintosh Intel Mac OS X Safari/605', 'macOS', 'Desktop'],
  ['Mozilla Linux x86_64 Firefox/130', 'Linux', 'Desktop'],
])('classifies %s without matching the generic desktop OS first', (ua, os, device) => {
  expect(parseAnalyticsUA(ua)).toMatchObject({ os, device });
});

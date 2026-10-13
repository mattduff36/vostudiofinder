import 'server-only';
import { db } from '@/lib/db';
import { analyticsRanges, utcDate, utcDates, fillDailySeries } from '@/lib/analytics/ranges';

// ---------------------------------------------------------------------------
// Site Analytics – powered by self-hosted page_views table
// ---------------------------------------------------------------------------
// Tracks visitors (unique per-day hash) and pageviews via /api/track.
// Replaces the earlier Vercel Web Analytics API approach (no public read API).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  visitors24h: number;
  visitors7d: number;
  pageviews24h: number;
  pageviews7d: number;
}

export interface TimeseriesPoint {
  date: string;
  visitors: number;
  pageviews: number;
}

export interface BreakdownEntry {
  key: string;
  visitors: number;
  pageviews: number;
}

export interface AnalyticsDetail {
  summary: AnalyticsSummary;
  timeseries7d: TimeseriesPoint[];
  timeseries30d: TimeseriesPoint[];
  topPages: BreakdownEntry[];
  topReferrers: BreakdownEntry[];
  topCountries: BreakdownEntry[];
  topBrowsers: BreakdownEntry[];
  topOS: BreakdownEntry[];
  topDevices: BreakdownEntry[];
}

export type AnalyticsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; configured: boolean };

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

// Query helpers
// ---------------------------------------------------------------------------

async function getTimeseries(since: Date, until: Date, days: number): Promise<TimeseriesPoint[]> {
  const rows = await db.$queryRaw<Array<{ day: Date; visitors: bigint; pageviews: bigint }>>`
    SELECT
      DATE(created_at) AS day,
      COUNT(DISTINCT visitor_hash) AS visitors,
      COUNT(*) AS pageviews
    FROM page_views
    WHERE created_at >= ${since} AND created_at < ${until}
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `;

  return fillDailySeries(rows.map((r) => ({
    date: utcDate(r.day),
    visitors: Number(r.visitors),
    pageviews: Number(r.pageviews),
  })), utcDates(days, until), date => ({ date, visitors: 0, pageviews: 0 }));
}

async function getBreakdown(
  column: string,
  since: Date,
  until: Date,
  limit: number,
): Promise<BreakdownEntry[]> {
  // Using raw query for dynamic column; column name is hard-coded at call sites
  const rows = await db.$queryRawUnsafe<
    Array<{ key: string | null; visitors: bigint; pageviews: bigint }>
  >(
    `SELECT
       ${column} AS key,
       COUNT(DISTINCT visitor_hash) AS visitors,
       COUNT(*) AS pageviews
     FROM page_views
     WHERE created_at >= $1 AND created_at < $2 AND ${column} IS NOT NULL
     GROUP BY ${column}
     ORDER BY visitors DESC
     LIMIT $3`,
    since,
    until,
    limit,
  );

  return rows.map((r) => ({
    key: r.key ?? '(unknown)',
    visitors: Number(r.visitors),
    pageviews: Number(r.pageviews),
  }));
}

// ---------------------------------------------------------------------------
// Public API: lightweight summary (for dashboard card)
// ---------------------------------------------------------------------------

export async function getVisitorSummary(now = new Date()): Promise<AnalyticsResult<AnalyticsSummary>> {
  try {
    const { rolling24h: since24h, days7: since7d } = analyticsRanges(now);

    const [day, week] = await Promise.all([
      db.$queryRaw<[{ visitors: bigint; pageviews: bigint }]>`
        SELECT
          COUNT(DISTINCT visitor_hash) AS visitors,
          COUNT(*) AS pageviews
        FROM page_views
        WHERE created_at >= ${since24h} AND created_at < ${now}
      `,
      db.$queryRaw<[{ visitors: bigint; pageviews: bigint }]>`
        SELECT
          COUNT(DISTINCT visitor_hash) AS visitors,
          COUNT(*) AS pageviews
        FROM page_views
        WHERE created_at >= ${since7d} AND created_at < ${now}
      `,
    ]);

    return {
      ok: true,
      data: {
        visitors24h: Number(day[0]?.visitors ?? 0),
        visitors7d: Number(week[0]?.visitors ?? 0),
        pageviews24h: Number(day[0]?.pageviews ?? 0),
        pageviews7d: Number(week[0]?.pageviews ?? 0),
      },
    };
  } catch (err) {
    console.error('[analytics] getVisitorSummary failed:', err);
    return {
      ok: false,
      error: 'Analytics is temporarily unavailable. Please retry.',
      configured: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API: full analytics detail (for /admin/analytics page)
// ---------------------------------------------------------------------------

export async function getAnalyticsDetail(now = new Date()): Promise<AnalyticsResult<AnalyticsDetail>> {
  try {
    const { days7: since7d, days30: since30d } = analyticsRanges(now);

    const [
      timeseries7d,
      timeseries30d,
      topPages,
      topReferrers,
      topCountries,
      topBrowsers,
      topOS,
      topDevices,
      summaryResult,
    ] = await Promise.all([
      getTimeseries(since7d, now, 7),
      getTimeseries(since30d, now, 30),
      getBreakdown('path', since7d, now, 20),
      getBreakdown('referrer', since7d, now, 20),
      getBreakdown('country', since7d, now, 20),
      getBreakdown('browser', since7d, now, 15),
      getBreakdown('os', since7d, now, 15),
      getBreakdown('device', since7d, now, 10),
      getVisitorSummary(now),
    ]);

    if (!summaryResult.ok) return summaryResult;

    return {
      ok: true,
      data: {
        summary: summaryResult.data,
        timeseries7d,
        timeseries30d,
        topPages,
        topReferrers,
        topCountries,
        topBrowsers,
        topOS,
        topDevices,
      },
    };
  } catch (err) {
    console.error('[analytics] getAnalyticsDetail failed:', err);
    return {
      ok: false,
      error: 'Analytics is temporarily unavailable. Please retry.',
      configured: true,
    };
  }
}

import 'server-only';
import { db } from '@/lib/db';

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

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

async function getTimeseries(since: Date): Promise<TimeseriesPoint[]> {
  const rows = await db.$queryRaw<Array<{ day: Date; visitors: bigint; pageviews: bigint }>>`
    SELECT
      DATE(created_at) AS day,
      COUNT(DISTINCT visitor_hash) AS visitors,
      COUNT(*) AS pageviews
    FROM page_views
    WHERE created_at >= ${since}
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `;

  return rows.map((r) => ({
    date: isoDate(r.day),
    visitors: Number(r.visitors),
    pageviews: Number(r.pageviews),
  }));
}

async function getBreakdown(
  column: string,
  since: Date,
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
     WHERE created_at >= $1 AND ${column} IS NOT NULL
     GROUP BY ${column}
     ORDER BY visitors DESC
     LIMIT $2`,
    since,
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

export async function getVisitorSummary(): Promise<AnalyticsResult<AnalyticsSummary>> {
  try {
    const since24h = daysAgo(1);
    const since7d = daysAgo(7);

    const [day, week] = await Promise.all([
      db.$queryRaw<[{ visitors: bigint; pageviews: bigint }]>`
        SELECT
          COUNT(DISTINCT visitor_hash) AS visitors,
          COUNT(*) AS pageviews
        FROM page_views
        WHERE created_at >= ${since24h}
      `,
      db.$queryRaw<[{ visitors: bigint; pageviews: bigint }]>`
        SELECT
          COUNT(DISTINCT visitor_hash) AS visitors,
          COUNT(*) AS pageviews
        FROM page_views
        WHERE created_at >= ${since7d}
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
      error: err instanceof Error ? err.message : 'Unknown error',
      configured: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Public API: full analytics detail (for /admin/analytics page)
// ---------------------------------------------------------------------------

export async function getAnalyticsDetail(): Promise<AnalyticsResult<AnalyticsDetail>> {
  try {
    const since7d = daysAgo(7);
    const since30d = daysAgo(30);

    const [
      timeseries7d,
      timeseries30d,
      topPages,
      topReferrers,
      topCountries,
      topBrowsers,
      topOS,
      topDevices,
    ] = await Promise.all([
      getTimeseries(since7d),
      getTimeseries(since30d),
      getBreakdown('path', since7d, 20),
      getBreakdown('referrer', since7d, 20),
      getBreakdown('country', since7d, 20),
      getBreakdown('browser', since7d, 15),
      getBreakdown('os', since7d, 15),
      getBreakdown('device', since7d, 10),
    ]);

    // Compute summary from 7d series
    const since24h = daysAgo(1);
    const today = isoDate(since24h);
    const recent = timeseries7d.filter((p) => p.date >= today);
    const visitors24h = recent.reduce((s, p) => s + p.visitors, 0);
    const pageviews24h = recent.reduce((s, p) => s + p.pageviews, 0);
    const visitors7d = timeseries7d.reduce((s, p) => s + p.visitors, 0);
    const pageviews7d = timeseries7d.reduce((s, p) => s + p.pageviews, 0);

    return {
      ok: true,
      data: {
        summary: { visitors24h, visitors7d, pageviews24h, pageviews7d },
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
      error: err instanceof Error ? err.message : 'Unknown error',
      configured: true,
    };
  }
}

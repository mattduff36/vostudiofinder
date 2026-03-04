import 'server-only';

// ---------------------------------------------------------------------------
// Vercel Web Analytics – server-side data client
// ---------------------------------------------------------------------------
//
// Required env vars (add to .env.local / Vercel project settings):
//   VERCEL_API_TOKEN   – personal or team-scoped Vercel API token
//   VERCEL_TEAM_ID     – team_xxx  (from Vercel dashboard → Settings → General)
//   VERCEL_PROJECT_ID  – prj_xxx   (from Vercel dashboard → Project → Settings)
//
// All fetches are server-only (imported with 'server-only' guard).
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.vercel.com';

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
  date: string;   // ISO date (YYYY-MM-DD or ISO timestamp)
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

export interface AnalyticsError {
  error: string;
  configured: boolean;
}

export type AnalyticsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; configured: boolean };

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  return { token, teamId, projectId };
}

function isConfigured(): boolean {
  const { token, teamId, projectId } = getConfig();
  return !!(token && teamId && projectId);
}

function headers(): HeadersInit {
  const { token } = getConfig();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Low-level Vercel API helpers
// ---------------------------------------------------------------------------

interface VercelTimeseriesResponse {
  data?: Array<{
    date?: string;
    key?: string;
    visits?: number;
    visitors?: number;
    pageviews?: number;
    total?: number;
  }>;
  // Fallback shapes for alternate API versions
  [key: string]: unknown;
}

async function fetchVercelAnalytics(
  path: string,
  params: Record<string, string>,
): Promise<VercelTimeseriesResponse> {
  const { teamId } = getConfig();
  const url = new URL(`${API_BASE}${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: headers(),
    next: { revalidate: 300 }, // cache for 5 min
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<VercelTimeseriesResponse>;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Normalise varying response shapes into our canonical types
// ---------------------------------------------------------------------------

function normaliseTimeseries(raw: VercelTimeseriesResponse): TimeseriesPoint[] {
  const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw as unknown[] : [];
  return (arr as Array<Record<string, unknown>>).map((item) => ({
    date: String(item.date ?? item.key ?? ''),
    visitors: Number(item.visitors ?? item.visits ?? 0),
    pageviews: Number(item.pageviews ?? item.total ?? 0),
  }));
}

function normaliseBreakdown(raw: VercelTimeseriesResponse): BreakdownEntry[] {
  const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw as unknown[] : [];
  return (arr as Array<Record<string, unknown>>).map((item) => ({
    key: String(item.key ?? item.date ?? ''),
    visitors: Number(item.visitors ?? item.visits ?? 0),
    pageviews: Number(item.pageviews ?? item.total ?? 0),
  }));
}

function sumField(points: TimeseriesPoint[], field: 'visitors' | 'pageviews'): number {
  return points.reduce((sum, p) => sum + p[field], 0);
}

// ---------------------------------------------------------------------------
// Public API: lightweight summary (for dashboard card)
// ---------------------------------------------------------------------------

export async function getVisitorSummary(): Promise<AnalyticsResult<AnalyticsSummary>> {
  if (!isConfigured()) {
    return {
      ok: false,
      error: 'Vercel Analytics not configured. Set VERCEL_API_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID.',
      configured: false,
    };
  }

  try {
    const { projectId } = getConfig();
    const now = new Date();
    const today = isoDate(now);
    const yesterday = isoDate(daysAgo(1));
    const sevenDaysAgo = isoDate(daysAgo(7));

    // Fetch 7-day timeseries (contains both 24h and 7d data)
    const raw7d = await fetchVercelAnalytics('/v1/web-analytics/timeseries', {
      projectId: projectId!,
      environment: 'production',
      from: sevenDaysAgo,
      to: today,
    });

    const points = normaliseTimeseries(raw7d);

    // Sum totals
    const visitors7d = sumField(points, 'visitors');
    const pageviews7d = sumField(points, 'pageviews');

    // Filter for last 24h (yesterday + today)
    const recent = points.filter((p) => p.date >= yesterday);
    const visitors24h = sumField(recent, 'visitors');
    const pageviews24h = sumField(recent, 'pageviews');

    return {
      ok: true,
      data: { visitors24h, visitors7d, pageviews24h, pageviews7d },
    };
  } catch (err) {
    console.error('[vercel-analytics] getVisitorSummary failed:', err);
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
  if (!isConfigured()) {
    return {
      ok: false,
      error: 'Vercel Analytics not configured. Set VERCEL_API_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID.',
      configured: false,
    };
  }

  try {
    const { projectId } = getConfig();
    const pid = projectId!;
    const now = new Date();
    const today = isoDate(now);
    const yesterday = isoDate(daysAgo(1));
    const sevenDaysAgo = isoDate(daysAgo(7));
    const thirtyDaysAgo = isoDate(daysAgo(30));

    const commonParams = { projectId: pid, environment: 'production' };

    // Fire requests in parallel
    const [
      raw7d,
      raw30d,
      rawPages,
      rawReferrers,
      rawCountries,
      rawBrowsers,
      rawOS,
      rawDevices,
    ] = await Promise.all([
      fetchVercelAnalytics('/v1/web-analytics/timeseries', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
      }),
      fetchVercelAnalytics('/v1/web-analytics/timeseries', {
        ...commonParams,
        from: thirtyDaysAgo,
        to: today,
      }),
      fetchVercelAnalytics('/v1/web-analytics/top', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
        column: 'path',
        limit: '20',
      }).catch(() => ({ data: [] })),
      fetchVercelAnalytics('/v1/web-analytics/top', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
        column: 'referrer',
        limit: '20',
      }).catch(() => ({ data: [] })),
      fetchVercelAnalytics('/v1/web-analytics/top', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
        column: 'country',
        limit: '20',
      }).catch(() => ({ data: [] })),
      fetchVercelAnalytics('/v1/web-analytics/top', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
        column: 'browser',
        limit: '15',
      }).catch(() => ({ data: [] })),
      fetchVercelAnalytics('/v1/web-analytics/top', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
        column: 'os',
        limit: '15',
      }).catch(() => ({ data: [] })),
      fetchVercelAnalytics('/v1/web-analytics/top', {
        ...commonParams,
        from: sevenDaysAgo,
        to: today,
        column: 'device',
        limit: '10',
      }).catch(() => ({ data: [] })),
    ]);

    const timeseries7d = normaliseTimeseries(raw7d);
    const timeseries30d = normaliseTimeseries(raw30d);

    // Compute summary from 7d series
    const visitors7d = sumField(timeseries7d, 'visitors');
    const pageviews7d = sumField(timeseries7d, 'pageviews');
    const recent = timeseries7d.filter((p) => p.date >= yesterday);
    const visitors24h = sumField(recent, 'visitors');
    const pageviews24h = sumField(recent, 'pageviews');

    return {
      ok: true,
      data: {
        summary: { visitors24h, visitors7d, pageviews24h, pageviews7d },
        timeseries7d,
        timeseries30d,
        topPages: normaliseBreakdown(rawPages),
        topReferrers: normaliseBreakdown(rawReferrers),
        topCountries: normaliseBreakdown(rawCountries),
        topBrowsers: normaliseBreakdown(rawBrowsers),
        topOS: normaliseBreakdown(rawOS),
        topDevices: normaliseBreakdown(rawDevices),
      },
    };
  } catch (err) {
    console.error('[vercel-analytics] getAnalyticsDetail failed:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      configured: true,
    };
  }
}

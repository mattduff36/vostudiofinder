#!/usr/bin/env tsx
/**
 * Search Console Indexing Export
 *
 * Pulls sitemap and indexing insights from Google Search Console using OAuth.
 * Exports CSV/JSON reports for:
 * - Indexed vs not indexed counts
 * - Not indexed reasons with affected URL lists
 * - Sitemap status and crawl info
 *
 * Usage examples:
 *   npm run seo:gsc -- --site-url "sc-domain:voiceoverstudiofinder.com"
 *   npm run seo:gsc -- --site-url "https://voiceoverstudiofinder.com/" --max-urls 300 --concurrency 4
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { gunzipSync } from 'zlib';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import { createObjectCsvWriter } from 'csv-writer';
import type { OAuth2Client } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/webmasters',
];

interface ScriptOptions {
  siteUrl: string;
  maxUrls: number;
  concurrency: number;
  credentialsPath: string;
  outputDir: string;
  sitemapFilter: string;
}

interface SitemapEntry {
  path: string;
  lastSubmitted: string;
  lastDownloaded: string;
  isPending: boolean;
  warnings: number;
  errors: number;
  type: string;
  submittedCount: number;
  indexedCount: number;
}

interface InspectionRow {
  url: string;
  indexed: boolean;
  reason: string;
  verdict: string;
  coverageState: string;
  indexingState: string;
  pageFetchState: string;
  robotsTxtState: string;
  googleCanonical: string;
  userCanonical: string;
  lastCrawlTime: string;
  referringSitemap: string;
  inspectedAt: string;
}

interface UrlInspectionResponse {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      indexingState?: string;
      pageFetchState?: string;
      robotsTxtState?: string;
      googleCanonical?: string;
      userCanonical?: string;
      lastCrawlTime?: string;
      referringUrls?: string[];
      sitemap?: string[];
    };
  };
  error?: {
    message?: string;
  };
}

function printHelp() {
  console.log(`
Search Console Indexing Export

Required:
  --site-url         Search Console property identifier
                     Example: "sc-domain:voiceoverstudiofinder.com"
                     Example: "https://voiceoverstudiofinder.com/"

Optional:
  --max-urls         Max URLs to inspect (default: 250)
  --concurrency      Parallel URL inspections (default: 3)
  --credentials      OAuth client JSON path (default: ./google-search-console-oauth.json)
  --output-dir       Output root directory (default: ./reports/search-console)
  --sitemap-filter   Only inspect sitemap URLs containing this text
  --help             Show help

Example:
  npm run seo:gsc -- --site-url "sc-domain:voiceoverstudiofinder.com" --max-urls 300
`);
}

function getArgValue(flag: string): string {
  const index = process.argv.indexOf(flag);
  if (index === -1) return '';
  return process.argv[index + 1] ?? '';
}

function parseInteger(value: string, fallback: number): number {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) return fallback;
  return parsedValue;
}

function parseOptions(): ScriptOptions {
  if (process.argv.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const siteUrl = getArgValue('--site-url');
  if (!siteUrl) {
    console.error('❌ Missing --site-url');
    printHelp();
    process.exit(1);
  }

  const credentialsFromArg = getArgValue('--credentials');
  const credentialsFromEnv = process.env.GSC_OAUTH_CLIENT_PATH;
  const credentialsPath = path.resolve(
    process.cwd(),
    credentialsFromArg || credentialsFromEnv || 'google-search-console-oauth.json',
  );

  return {
    siteUrl,
    maxUrls: parseInteger(getArgValue('--max-urls'), 250),
    concurrency: parseInteger(getArgValue('--concurrency'), 3),
    credentialsPath,
    outputDir: path.resolve(process.cwd(), getArgValue('--output-dir') || 'reports/search-console'),
    sitemapFilter: getArgValue('--sitemap-filter'),
  };
}

function getTimestamp(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}Z`;
}

async function ensureDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function loadSavedCredentialsIfExist(tokenPath: string): Promise<OAuth2Client | null> {
  try {
    const content = await fs.readFile(tokenPath, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as OAuth2Client;
  } catch {
    return null;
  }
}

async function saveCredentials(client: OAuth2Client, credentialsPath: string, tokenPath: string): Promise<void> {
  const content = await fs.readFile(credentialsPath, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await ensureDirectory(path.dirname(tokenPath));
  await fs.writeFile(tokenPath, payload, 'utf8');
}

async function authorize(credentialsPath: string, tokenPath: string): Promise<OAuth2Client> {
  const savedClient = await loadSavedCredentialsIfExist(tokenPath);
  if (savedClient) return savedClient;

  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: credentialsPath,
  });

  if (client.credentials) {
    await saveCredentials(client, credentialsPath, tokenPath);
  }

  return client;
}

async function assertSiteAccess(auth: OAuth2Client, siteUrl: string): Promise<void> {
  const webmasters = google.webmasters({ version: 'v3', auth });
  const siteListResponse = await webmasters.sites.list();
  const siteEntries = siteListResponse.data.siteEntry ?? [];
  const matchingSite = siteEntries.find(entry => entry.siteUrl === siteUrl);

  if (!matchingSite) {
    const knownSites = siteEntries.map(entry => entry.siteUrl).filter(Boolean);
    console.error(`❌ The authenticated account does not have Search Console access to: ${siteUrl}`);
    console.error('Available properties on this account:');
    knownSites.forEach(knownSite => console.error(`   - ${knownSite}`));
    process.exit(1);
  }
}

function getFirstContentCount(
  contents: Array<{ indexed?: string; submitted?: string }> | undefined,
  key: 'indexed' | 'submitted',
): number {
  const rawValue = contents?.[0]?.[key];
  if (!rawValue) return 0;
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

async function listSitemaps(auth: OAuth2Client, siteUrl: string): Promise<SitemapEntry[]> {
  const webmasters = google.webmasters({ version: 'v3', auth });
  const response = await webmasters.sitemaps.list({ siteUrl });
  const rows = response.data.sitemap ?? [];

  return rows.map(row => ({
    path: row.path || '',
    lastSubmitted: row.lastSubmitted || '',
    lastDownloaded: row.lastDownloaded || '',
    isPending: Boolean(row.isPending),
    warnings: Number(row.warnings ?? 0),
    errors: Number(row.errors ?? 0),
    type: row.type || '',
    submittedCount: getFirstContentCount(row.contents as Array<{ indexed?: string; submitted?: string }>, 'submitted'),
    indexedCount: getFirstContentCount(row.contents as Array<{ indexed?: string; submitted?: string }>, 'indexed'),
  }));
}

async function fetchSitemapContent(sitemapUrl: string): Promise<string> {
  const response = await fetch(sitemapUrl, {
    headers: {
      'user-agent': 'VoiceoverStudioFinder-SearchConsoleAudit/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap (${response.status}): ${sitemapUrl}`);
  }

  if (sitemapUrl.endsWith('.gz')) {
    const compressedData = new Uint8Array(await response.arrayBuffer());
    return gunzipSync(compressedData).toString('utf8');
  }

  return response.text();
}

function extractLocValues(xmlContent: string): string[] {
  const locRegex = /<loc>(.*?)<\/loc>/gims;
  const matches: string[] = [];
  let matchResult = locRegex.exec(xmlContent);

  while (matchResult) {
    const locValue = matchResult[1]?.trim();
    if (locValue) matches.push(locValue);
    matchResult = locRegex.exec(xmlContent);
  }

  return matches;
}

async function collectUrlsFromSitemap(
  sitemapUrl: string,
  visitedSitemaps: Set<string>,
  collectedUrls: Set<string>,
): Promise<void> {
  if (visitedSitemaps.has(sitemapUrl)) return;
  visitedSitemaps.add(sitemapUrl);

  const xmlContent = await fetchSitemapContent(sitemapUrl);
  const lowerXml = xmlContent.toLowerCase();
  const locValues = extractLocValues(xmlContent);
  const isSitemapIndex = lowerXml.includes('<sitemapindex');

  if (isSitemapIndex) {
    for (const childSitemapUrl of locValues) {
      await collectUrlsFromSitemap(childSitemapUrl, visitedSitemaps, collectedUrls);
    }
    return;
  }

  locValues.forEach(loc => collectedUrls.add(loc));
}

function isIndexedCoverageState(coverageState: string): boolean {
  if (!coverageState) return false;
  const normalizedCoverageState = coverageState.toLowerCase();
  if (!normalizedCoverageState.includes('indexed')) return false;
  if (normalizedCoverageState.includes('not indexed')) return false;
  return true;
}

function normalizeReason(row: {
  verdict: string;
  coverageState: string;
  indexingState: string;
  pageFetchState: string;
}): string {
  if (row.verdict === 'PASS' || isIndexedCoverageState(row.coverageState)) return 'Indexed';
  return row.coverageState || row.indexingState || row.pageFetchState || row.verdict || 'Unknown reason';
}

async function getAccessToken(auth: OAuth2Client): Promise<string> {
  const tokenResult = await auth.getAccessToken();
  const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
  if (!token) throw new Error('Unable to obtain Google OAuth access token');
  return token;
}

async function inspectUrl(auth: OAuth2Client, siteUrl: string, inspectionUrl: string): Promise<InspectionRow> {
  const accessToken = await getAccessToken(auth);

  const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl,
      languageCode: 'en-GB',
    }),
  });

  const body = (await response.json()) as UrlInspectionResponse;
  if (!response.ok) {
    const message = body.error?.message || `Request failed with status ${response.status}`;
    return {
      url: inspectionUrl,
      indexed: false,
      reason: `API error: ${message}`,
      verdict: 'ERROR',
      coverageState: '',
      indexingState: '',
      pageFetchState: '',
      robotsTxtState: '',
      googleCanonical: '',
      userCanonical: '',
      lastCrawlTime: '',
      referringSitemap: '',
      inspectedAt: new Date().toISOString(),
    };
  }

  const indexStatus = body.inspectionResult?.indexStatusResult ?? {};
  const verdict = indexStatus.verdict || '';
  const coverageState = indexStatus.coverageState || '';
  const indexingState = indexStatus.indexingState || '';
  const pageFetchState = indexStatus.pageFetchState || '';
  const reason = normalizeReason({
    verdict,
    coverageState,
    indexingState,
    pageFetchState,
  });

  const indexed = reason === 'Indexed';

  return {
    url: inspectionUrl,
    indexed,
    reason,
    verdict: verdict || 'UNKNOWN',
    coverageState,
    indexingState,
    pageFetchState,
    robotsTxtState: indexStatus.robotsTxtState || '',
    googleCanonical: indexStatus.googleCanonical || '',
    userCanonical: indexStatus.userCanonical || '',
    lastCrawlTime: indexStatus.lastCrawlTime || '',
    referringSitemap: indexStatus.sitemap?.join(' | ') || '',
    inspectedAt: new Date().toISOString(),
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length || 1);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

async function writeCsvReports(outputPath: string, sitemapRows: SitemapEntry[], inspectionRows: InspectionRow[]): Promise<void> {
  const sitemapCsv = createObjectCsvWriter({
    path: path.join(outputPath, 'sitemaps.csv'),
    header: [
      { id: 'path', title: 'SITEMAP_URL' },
      { id: 'type', title: 'TYPE' },
      { id: 'submittedCount', title: 'SUBMITTED_URLS' },
      { id: 'indexedCount', title: 'INDEXED_URLS' },
      { id: 'warnings', title: 'WARNINGS' },
      { id: 'errors', title: 'ERRORS' },
      { id: 'isPending', title: 'IS_PENDING' },
      { id: 'lastSubmitted', title: 'LAST_SUBMITTED' },
      { id: 'lastDownloaded', title: 'LAST_DOWNLOADED' },
    ],
  });
  await sitemapCsv.writeRecords(sitemapRows);

  const inspectionCsv = createObjectCsvWriter({
    path: path.join(outputPath, 'url-inspections.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'indexed', title: 'IS_INDEXED' },
      { id: 'reason', title: 'REASON' },
      { id: 'verdict', title: 'VERDICT' },
      { id: 'coverageState', title: 'COVERAGE_STATE' },
      { id: 'indexingState', title: 'INDEXING_STATE' },
      { id: 'pageFetchState', title: 'PAGE_FETCH_STATE' },
      { id: 'robotsTxtState', title: 'ROBOTS_TXT_STATE' },
      { id: 'googleCanonical', title: 'GOOGLE_CANONICAL' },
      { id: 'userCanonical', title: 'USER_CANONICAL' },
      { id: 'lastCrawlTime', title: 'LAST_CRAWL_TIME' },
      { id: 'referringSitemap', title: 'REFERRING_SITEMAP' },
      { id: 'inspectedAt', title: 'INSPECTED_AT' },
    ],
  });
  await inspectionCsv.writeRecords(inspectionRows);

  const indexedRows = inspectionRows.filter(row => row.indexed);
  const notIndexedRows = inspectionRows.filter(row => !row.indexed);

  const indexedCsv = createObjectCsvWriter({
    path: path.join(outputPath, 'indexed-urls.csv'),
    header: [{ id: 'url', title: 'URL' }],
  });
  await indexedCsv.writeRecords(indexedRows.map(row => ({ url: row.url })));

  const notIndexedCsv = createObjectCsvWriter({
    path: path.join(outputPath, 'not-indexed-urls.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'reason', title: 'REASON' },
    ],
  });
  await notIndexedCsv.writeRecords(notIndexedRows.map(row => ({ url: row.url, reason: row.reason })));

  const groupedReasons = new Map<string, string[]>();
  for (const row of notIndexedRows) {
    if (!groupedReasons.has(row.reason)) groupedReasons.set(row.reason, []);
    groupedReasons.get(row.reason)?.push(row.url);
  }

  const reasonRows = Array.from(groupedReasons.entries())
    .map(([reason, urls]) => ({
      reason,
      count: urls.length,
      sampleUrls: urls.slice(0, 10).join(' | '),
    }))
    .sort((a, b) => b.count - a.count);

  const reasonCsv = createObjectCsvWriter({
    path: path.join(outputPath, 'not-indexed-reasons.csv'),
    header: [
      { id: 'reason', title: 'REASON' },
      { id: 'count', title: 'COUNT' },
      { id: 'sampleUrls', title: 'SAMPLE_URLS' },
    ],
  });
  await reasonCsv.writeRecords(reasonRows);

  await fs.writeFile(
    path.join(outputPath, 'not-indexed-urls-by-reason.json'),
    JSON.stringify(Object.fromEntries(groupedReasons.entries()), null, 2),
    'utf8',
  );

  await fs.writeFile(
    path.join(outputPath, 'summary.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: {
          inspectedUrls: inspectionRows.length,
          indexedUrls: indexedRows.length,
          notIndexedUrls: notIndexedRows.length,
        },
        topNotIndexedReasons: reasonRows.slice(0, 20),
      },
      null,
      2,
    ),
    'utf8',
  );
}

async function main() {
  if (!process.argv.includes('--help')) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  }

  const options = parseOptions();

  if (!fsSync.existsSync(options.credentialsPath)) {
    console.error(`❌ OAuth client JSON not found: ${options.credentialsPath}`);
    console.error('Create a Desktop OAuth client in Google Cloud Console and download the JSON file.');
    process.exit(1);
  }

  const tokenPath = path.resolve(process.cwd(), '.cache/search-console/token.json');
  const runOutputPath = path.join(options.outputDir, getTimestamp());
  await ensureDirectory(runOutputPath);

  console.log('🔐 Authorizing with Google Search Console...');
  const auth = await authorize(options.credentialsPath, tokenPath);

  console.log(`🔎 Validating access to property: ${options.siteUrl}`);
  await assertSiteAccess(auth, options.siteUrl);

  console.log('🗺️  Pulling sitemap data from Search Console...');
  const sitemapRows = await listSitemaps(auth, options.siteUrl);
  const filteredSitemaps = options.sitemapFilter
    ? sitemapRows.filter(row => row.path.includes(options.sitemapFilter))
    : sitemapRows;

  if (filteredSitemaps.length === 0) {
    console.error('❌ No sitemap entries found (or filter excluded all entries).');
    process.exit(1);
  }

  const sitemapUrls = filteredSitemaps.map(row => row.path).filter(Boolean);
  console.log(`✅ Found ${sitemapUrls.length} sitemap(s). Collecting URLs from sitemap XML...`);

  const visitedSitemaps = new Set<string>();
  const collectedUrls = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    try {
      await collectUrlsFromSitemap(sitemapUrl, visitedSitemaps, collectedUrls);
    } catch (error) {
      console.warn(`⚠️  Failed to parse sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const urlsForInspection = Array.from(collectedUrls).slice(0, options.maxUrls);
  if (urlsForInspection.length === 0) {
    console.error('❌ No URLs discovered from sitemaps to inspect.');
    process.exit(1);
  }

  console.log(`🧪 Inspecting ${urlsForInspection.length} URL(s) with concurrency ${options.concurrency}...`);
  const inspectionRows = await runWithConcurrency(
    urlsForInspection,
    options.concurrency,
    async (url, index) => {
      const row = await inspectUrl(auth, options.siteUrl, url);
      const position = index + 1;
      if (position % 25 === 0 || position === urlsForInspection.length) {
        console.log(`   Progress: ${position}/${urlsForInspection.length}`);
      }
      return row;
    },
  );

  await writeCsvReports(runOutputPath, filteredSitemaps, inspectionRows);

  const indexedCount = inspectionRows.filter(row => row.indexed).length;
  const notIndexedCount = inspectionRows.length - indexedCount;

  console.log('\n✅ Search Console export complete');
  console.log(`   Output directory: ${runOutputPath}`);
  console.log(`   URLs inspected: ${inspectionRows.length}`);
  console.log(`   Indexed: ${indexedCount}`);
  console.log(`   Not indexed: ${notIndexedCount}`);
  console.log('\nFiles generated:');
  console.log('   - summary.json');
  console.log('   - sitemaps.csv');
  console.log('   - url-inspections.csv');
  console.log('   - indexed-urls.csv');
  console.log('   - not-indexed-urls.csv');
  console.log('   - not-indexed-reasons.csv');
  console.log('   - not-indexed-urls-by-reason.json');
}

main().catch(error => {
  console.error('❌ Script failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

import { NextRequest, NextResponse } from 'next/server';

const STATIC_PAGES = new Set(['/', '/about', '/privacy', '/terms', '/help', '/blog']);

const ALLOWED_STUDIOS_QUERY_PARAMS = [
  'q',
  'location',
  'studioTypes',
  'studio_type',
  'services',
  'equipment',
  'sortBy',
  'sort_order',
  'radius',
  'lat',
  'lng',
  'page',
  'limit',
  'offset',
  'seed',
  'type',
  'ids',
  'studioId',
];

const TOXIC_QUERY_KEYS = new Set(['lang', 'r', 'ci']);
const EXCLUDED_PREFIXES = ['/api', '/admin', '/dashboard', '/auth', '/_next', '/private', '/email/unsubscribe'];
const STUDIO_NUMERIC_QUERY_PARAMS = new Set(['radius', 'lat', 'lng', 'page', 'limit', 'offset']);

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasToxicUrlPattern(value: string): boolean {
  let normalizedValue = value.toLowerCase();
  try {
    normalizedValue = decodeURIComponent(value).toLowerCase();
  } catch {
    normalizedValue = value.toLowerCase();
  }

  return (
    normalizedValue.includes('http://') ||
    normalizedValue.includes('https://') ||
    normalizedValue.includes('//') ||
    normalizedValue.includes('www.')
  );
}

function isValidStudioQueryValue(key: string, value: string): boolean {
  const normalizedValue = value.trim();
  if (!normalizedValue) return false;
  if (TOXIC_QUERY_KEYS.has(key)) return false;
  if (hasToxicUrlPattern(normalizedValue)) return false;

  if (STUDIO_NUMERIC_QUERY_PARAMS.has(key))
    return Number.isFinite(Number(normalizedValue));

  return true;
}

function buildCleanSearchParams(
  source: URLSearchParams,
  allowedKeys: string[],
): URLSearchParams {
  const cleaned = new URLSearchParams();

  allowedKeys.forEach(key => {
    const values = source.getAll(key);

    values.forEach(value => {
      const normalizedValue = value.trim();
      if (isValidStudioQueryValue(key, normalizedValue))
        cleaned.append(key, normalizedValue);
    });
  });

  return cleaned;
}

function redirectWithSearch(request: NextRequest, search: string): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.search = search;
  return NextResponse.redirect(redirectUrl, 301);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  if (!searchParams.size) {
    return NextResponse.next();
  }

  if (STATIC_PAGES.has(pathname)) {
    return redirectWithSearch(request, '');
  }

  if (pathname === '/studios') {
    const cleaned = buildCleanSearchParams(searchParams, ALLOWED_STUDIOS_QUERY_PARAMS);
    const cleanedString = cleaned.toString();
    const originalString = searchParams.toString();

    if (cleanedString !== originalString) {
      return redirectWithSearch(request, cleanedString ? `?${cleanedString}` : '');
    }

    return NextResponse.next();
  }

  const hasToxicParam = Array.from(searchParams.entries()).some(([key, value]) => {
    if (TOXIC_QUERY_KEYS.has(key)) return true;
    return hasToxicUrlPattern(value);
  });

  if (hasToxicParam || searchParams.size > 0) {
    return redirectWithSearch(request, '');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};

import { NextRequest, NextResponse } from 'next/server';

const STATIC_PAGES = new Set(['/', '/about', '/privacy', '/terms', '/help', '/blog']);

const ALLOWED_STUDIOS_QUERY_PARAMS = new Set([
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
]);

function buildCleanSearchParams(
  source: URLSearchParams,
  allowedKeys: Set<string>,
): URLSearchParams {
  const cleaned = new URLSearchParams();

  source.forEach((value, key) => {
    if (allowedKeys.has(key)) {
      cleaned.append(key, value);
    }
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/about', '/privacy', '/terms', '/help', '/blog', '/studios'],
};

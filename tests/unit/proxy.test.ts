/**
 * Regression tests for Next.js Proxy URL/query sanitisation.
 * @jest-environment node
 *
 * Next.js 16.3.3 still exports `unstable_doesMiddlewareMatch` from
 * `next/experimental/testing/server` (there is no `unstable_doesProxyMatch`
 * in this release). Matcher tests use that helper; behaviour tests call
 * `proxy` directly and do not start a server or touch a database.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server';
import { config, proxy } from '@/proxy';

const ORIGIN = 'http://localhost:4000';

function requestFor(pathAndQuery: string): NextRequest {
  return new NextRequest(`${ORIGIN}${pathAndQuery}`);
}

function locationPathAndSearch(response: NextResponse): string {
  const location = getRedirectUrl(response);
  expect(location).toBeTruthy();
  const url = new URL(location as string);
  return `${url.pathname}${url.search}`;
}

function expectContinue(response: NextResponse) {
  expect(response.status).not.toBe(301);
  expect(getRedirectUrl(response)).toBeNull();
}

function expectRedirect301(response: NextResponse, pathAndQuery: string) {
  expect(response.status).toBe(301);
  expect(locationPathAndSearch(response)).toBe(pathAndQuery);
}

function matcherMatches(pathAndQuery: string): boolean {
  return unstable_doesMiddlewareMatch({
    config,
    url: `${ORIGIN}${pathAndQuery}`,
  });
}

describe('Proxy matcher', () => {
  it('matches the home page', () => {
    expect(matcherMatches('/')).toBe(true);
  });

  it('matches /about', () => {
    expect(matcherMatches('/about')).toBe(true);
  });

  it('matches /studios', () => {
    expect(matcherMatches('/studios')).toBe(true);
  });

  it('matches a representative studio profile path', () => {
    expect(matcherMatches('/some-studio-name')).toBe(true);
  });

  it('does not match Next static assets', () => {
    expect(matcherMatches('/_next/static/chunks/main.js')).toBe(false);
  });

  it('does not match the Next image optimizer', () => {
    expect(matcherMatches('/_next/image')).toBe(false);
    expect(matcherMatches('/_next/image?url=%2Flogo.png&w=64&q=75')).toBe(false);
  });

  it('does not match favicon.ico', () => {
    expect(matcherMatches('/favicon.ico')).toBe(false);
  });

  it('does not match robots.txt', () => {
    expect(matcherMatches('/robots.txt')).toBe(false);
  });

  it('does not match sitemap.xml', () => {
    expect(matcherMatches('/sitemap.xml')).toBe(false);
  });

  it('does not match a representative asset path with a file extension', () => {
    expect(matcherMatches('/assets/logo.png')).toBe(false);
  });
});

describe('Proxy query sanitisation', () => {
  it('continues a matched request with no query string', () => {
    expectContinue(proxy(requestFor('/')));
    expectContinue(proxy(requestFor('/about')));
    expectContinue(proxy(requestFor('/studios')));
    expectContinue(proxy(requestFor('/some-studio-name')));
  });

  it('strips all query parameters from static pages with a 301', () => {
    expectRedirect301(proxy(requestFor('/about?utm_source=test')), '/about');
    expectRedirect301(proxy(requestFor('/blog?foo=bar')), '/blog');
  });

  it('does not strip query parameters on excluded prefixes', () => {
    expectContinue(proxy(requestFor('/api/example?foo=bar')));
    expectContinue(proxy(requestFor('/admin/example?foo=bar')));
    expectContinue(proxy(requestFor('/dashboard?foo=bar')));
    expectContinue(proxy(requestFor('/email/unsubscribe?token=abc123')));
  });

  it('continues /studios when the query is already canonical and valid', () => {
    expectContinue(proxy(requestFor('/studios?q=voice')));
    expectContinue(proxy(requestFor('/studios?location=london')));
    expectContinue(
      proxy(requestFor('/studios?q=voice&location=london&radius=10&lat=51.5&lng=-0.1&page=1')),
    );
    expectContinue(proxy(requestFor('/studios?q=one&q=two')));
  });

  it('removes unknown /studios parameters and redirects to the cleaned URL', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=voice&foo=bar')),
      '/studios?q=voice',
    );
  });

  it('removes toxic /studios keys and redirects to the cleaned URL', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=voice&lang=en')),
      '/studios?q=voice',
    );
  });

  it('removes URL-containing /studios values and redirects to the cleaned URL', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=http://evil.example')),
      '/studios',
    );
  });

  it('removes percent-encoded URL-like /studios values after decoding', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=https%3A%2F%2Fevil.example')),
      '/studios',
    );
  });

  it('removes empty /studios values and preserves remaining allowed parameters', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=&location=london')),
      '/studios?location=london',
    );
  });

  it('removes non-finite numeric /studios values and preserves valid parameters', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=voice&page=abc')),
      '/studios?q=voice',
    );
  });

  it('preserves valid /studios parameters while removing mixed invalid ones', () => {
    expectRedirect301(
      proxy(requestFor('/studios?q=voice&foo=1&lang=en&page=not-a-number')),
      '/studios?q=voice',
    );
  });

  it('strips the full query string from other non-excluded pages with a 301', () => {
    expectRedirect301(proxy(requestFor('/some-studio?foo=bar')), '/some-studio');
  });

  it('does not throw on malformed percent-encoding', () => {
    expect(() => proxy(requestFor('/studios?q=%E0%A4%A'))).not.toThrow();
    expect(() => proxy(requestFor('/about?q=%E0%A4%A'))).not.toThrow();
    expect(() => proxy(requestFor('/some-studio?q=%'))).not.toThrow();
  });
});

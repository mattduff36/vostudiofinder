import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/seo/site';

export async function GET(request: NextRequest) {
  // Test what getBaseUrl returns in an API route context
  const baseUrl = getBaseUrl(request);
  
  // Collect all request information
  const requestInfo = {
    // Headers
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-vercel-deployment-url': request.headers.get('x-vercel-deployment-url'),
      'x-vercel-forwarded-proto': request.headers.get('x-vercel-forwarded-proto'),
      'x-vercel-proxied-for': request.headers.get('x-vercel-proxied-for'),
    },
    
    // Environment variables
    env: {
      VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
      VERCEL_ENV: process.env.VERCEL_ENV || 'NOT SET',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    },
    
    // Result from getBaseUrl
    getBaseUrlResult: baseUrl,
    
    // Request URL
    requestUrl: request.url,
    requestNextUrl: {
      href: request.nextUrl.href,
      origin: request.nextUrl.origin,
      hostname: request.nextUrl.hostname,
      protocol: request.nextUrl.protocol,
    },
  };
  
  console.log('🔍 API Route URL Detection Test:', JSON.stringify(requestInfo, null, 2));
  
  return NextResponse.json({
    message: 'URL Detection Test from API Route',
    ...requestInfo,
  });
}

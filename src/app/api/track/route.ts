import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { headers } from 'next/headers';

import { parseAnalyticsUA } from '@/lib/analytics/user-agent';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.path || typeof body.path !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const headersList = await headers();
    const ua = headersList.get('user-agent') ?? '';
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? headersList.get('x-real-ip')
      ?? headersList.get('x-vercel-ip-address')
      ?? '0.0.0.0';
    const country = headersList.get('x-vercel-ip-country') ?? null;

    // Privacy-friendly daily visitor hash (same approach as Vercel Analytics)
    const dayKey = new Date().toISOString().split('T')[0];
    const visitorHash = createHash('sha256')
      .update(`${ip}|${ua}|${dayKey}`)
      .digest('hex')
      .slice(0, 16);

    const { browser, os, device } = parseAnalyticsUA(ua);

    const referrer = typeof body.referrer === 'string'
      ? body.referrer.slice(0, 500) || null
      : null;

    await db.page_views.create({
      data: {
        path: body.path.slice(0, 500),
        referrer,
        country,
        device,
        browser,
        os,
        visitor_hash: visitorHash,
      },
    });

    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[track] Error recording page view:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

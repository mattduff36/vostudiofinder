import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { headers } from 'next/headers';

function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
    device = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
  }

  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  return { browser, os, device };
}

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

    const { browser, os, device } = parseUA(ua);

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

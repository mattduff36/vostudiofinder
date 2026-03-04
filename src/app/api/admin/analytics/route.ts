import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAnalyticsDetail, getVisitorSummary } from '@/lib/vercel-analytics';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') ?? 'detail';

    if (mode === 'summary') {
      const result = await getVisitorSummary();
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, configured: result.configured },
          { status: result.configured ? 502 : 503 },
        );
      }
      return NextResponse.json(result.data, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      });
    }

    const result = await getAnalyticsDetail();
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, configured: result.configured },
        { status: result.configured ? 502 : 503 },
      );
    }

    return NextResponse.json(result.data, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

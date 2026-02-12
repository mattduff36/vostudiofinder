import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all platform updates (public endpoint, no auth required)
export async function GET() {
  try {
    const updates = await db.platform_updates.findMany({
      orderBy: { release_date: 'desc' },
    });

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('Error fetching platform updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform updates' },
      { status: 500 }
    );
  }
}

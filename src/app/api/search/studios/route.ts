import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Searches active studio profiles by name.
 * Used by the home-page search bar to show studio-name suggestions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ studios: [] });
    }

    const searchTerm = query.trim();

    const studios = await db.studio_profiles.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { name: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        city: true,
        users: {
          select: { username: true },
        },
      },
      take: 5,
      orderBy: { name: 'asc' },
    });

    // Only return studios whose owner has a username (always true per schema,
    // but defensive in case of data inconsistencies)
    return NextResponse.json({
      studios: studios
        .filter((s) => s.users?.username)
        .map((s) => ({
          id: s.id,
          name: s.name,
          city: s.city,
          username: s.users!.username,
        })),
    });
  } catch (error) {
    console.error('Error searching studios:', error);
    return NextResponse.json({ error: 'Failed to search studios' }, { status: 500 });
  }
}

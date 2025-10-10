import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const saveSearchSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.object({
    location: z.string().optional(),
    radius: z.number().optional(),
    services: z.array(z.string()).optional(),
    studioType: z.string().optional(),
    minRating: z.number().optional(),
  }),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const savedSearches = await db.savedSearch.findMany({
      where: { userId: session.user.id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ savedSearches });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, filters } = saveSearchSchema.parse(body);

    const savedSearch = await db.savedSearch.create({
      data: {
        userId: session.user.id,
        name,
        filters: JSON.stringify(filters),
      },
    });

    return NextResponse.json({ savedSearch });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error saving search:', error);
    return NextResponse.json(
      { error: 'Failed to save search' },
      { status: 500 }
    );
  }
}

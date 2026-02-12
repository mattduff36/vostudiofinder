import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { PlatformUpdateCategory } from '@prisma/client';

// GET - Fetch all platform updates (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

// POST - Create new platform update (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, category, release_date, is_highlighted } = body;

    if (!description || !category || !release_date) {
      return NextResponse.json(
        { error: 'Description, category, and release_date are required' },
        { status: 400 }
      );
    }

    const validCategories: PlatformUpdateCategory[] = ['FEATURE', 'IMPROVEMENT', 'FIX', 'SECURITY'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: FEATURE, IMPROVEMENT, FIX, SECURITY' },
        { status: 400 }
      );
    }

    const update = await db.platform_updates.create({
      data: {
        title: title || null,
        description,
        category,
        release_date: new Date(release_date),
        is_highlighted: is_highlighted ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      update,
      message: 'Platform update created successfully',
    });
  } catch (error) {
    console.error('Error creating platform update:', error);
    return NextResponse.json(
      { error: 'Failed to create platform update' },
      { status: 500 }
    );
  }
}

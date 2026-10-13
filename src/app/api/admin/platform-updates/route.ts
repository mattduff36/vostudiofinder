import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { platformUpdateFields } from '@/lib/admin/content-validation';
import { parseContent, contentError } from '@/lib/admin/content-api';

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
      orderBy: [{ release_date: 'desc' }, { id: 'asc' }],
    });

    return NextResponse.json({ updates });
  } catch (error) {
    return contentError(error, 'Failed to fetch platform updates');
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

    const { title, description, category, release_date, is_highlighted } = await parseContent(request, platformUpdateFields.strict());

    const update = await db.platform_updates.create({
      data: {
        title: title || null,
        description,
        category,
        release_date: new Date(`${release_date}T00:00:00.000Z`),
        is_highlighted: is_highlighted ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      update,
      message: 'Platform update created successfully',
    });
  } catch (error) {
    return contentError(error, 'Failed to create platform update');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const studioId = (await params).id;
    const body = await request.json();
    const { imageIds } = body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid image IDs' }, { status: 400 });
    }

    const studio = await db.studio_profiles.findUnique({
      where: { id: studioId },
      select: { id: true },
    });

    if (!studio) {
      return NextResponse.json({ success: false, error: 'Studio not found' }, { status: 404 });
    }

    const transaction = imageIds.map((imageId, index) =>
      db.studio_images.updateMany({
        where: { id: imageId, studio_id: studio.id },
        data: { sort_order: index },
      })
    );

    await db.$transaction(transaction);

    return NextResponse.json({ success: true, message: 'Images reordered successfully' });
  } catch (error) {
    console.error('Error reordering images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder images' },
      { status: 500 }
    );
  }
}


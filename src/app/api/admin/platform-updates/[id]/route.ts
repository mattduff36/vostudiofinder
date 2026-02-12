import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { PlatformUpdateCategory } from '@prisma/client';

// PATCH - Update platform update (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, category, release_date, is_highlighted } = body;

    const updateData: {
      title?: string | null;
      description?: string;
      category?: PlatformUpdateCategory;
      release_date?: Date;
      is_highlighted?: boolean;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (title !== undefined) updateData.title = title || null;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) {
      const validCategories: PlatformUpdateCategory[] = ['FEATURE', 'IMPROVEMENT', 'FIX', 'SECURITY'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category. Must be one of: FEATURE, IMPROVEMENT, FIX, SECURITY' },
          { status: 400 }
        );
      }
      updateData.category = category;
    }
    if (release_date !== undefined) updateData.release_date = new Date(release_date);
    if (is_highlighted !== undefined) updateData.is_highlighted = is_highlighted;

    const update = await db.platform_updates.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      update,
      message: 'Platform update updated successfully',
    });
  } catch (error) {
    console.error('Error updating platform update:', error);
    return NextResponse.json(
      { error: 'Failed to update platform update' },
      { status: 500 }
    );
  }
}

// DELETE - Delete platform update (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    await db.platform_updates.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Platform update deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting platform update:', error);
    return NextResponse.json(
      { error: 'Failed to delete platform update' },
      { status: 500 }
    );
  }
}

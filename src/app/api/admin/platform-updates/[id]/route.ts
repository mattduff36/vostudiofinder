import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { platformUpdateFields } from '@/lib/admin/content-validation';
import { parseContent, contentError } from '@/lib/admin/content-api';

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
    const { release_date, title, ...fields } = await parseContent(request, platformUpdateFields.partial().strict().refine(value => Object.keys(value).length > 0));
    const updateData = { ...(fields.description !== undefined ? { description: fields.description } : {}), ...(fields.category !== undefined ? { category: fields.category } : {}), ...(fields.is_highlighted !== undefined ? { is_highlighted: fields.is_highlighted } : {}), ...(title !== undefined ? { title: title || null } : {}),
      ...(release_date !== undefined ? { release_date: new Date(`${release_date}T00:00:00.000Z`) } : {}), updated_at: new Date() };

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
    return contentError(error, 'Failed to update platform update');
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
    return contentError(error, 'Failed to delete platform update');
  }
}

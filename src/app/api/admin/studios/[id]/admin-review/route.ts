import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { adminReview } = (await request.json()) as { adminReview: boolean };

    const updatedStudio = await db.studio_profiles.update({
      where: { id },
      data: { admin_review: adminReview },
      select: {
        id: true,
        name: true,
        admin_review: true,
      },
    });

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
      message: `Admin review ${adminReview ? 'enabled' : 'disabled'} for ${updatedStudio.name}`,
    });
  } catch (error) {
    console.error('Update admin review error:', error);
    return NextResponse.json({ error: 'Failed to update admin review' }, { status: 500 });
  }
}

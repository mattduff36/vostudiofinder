import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studioId, status } = await request.json();

    if (!studioId || !['VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const updatedStudio = await db.studio.update({
      where: { id: studioId },
            data: {
        status,
        isVerified: status === 'VERIFIED',
      },
    });

    // Send notification email to studio owner
    // TODO: Implement email notification

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
    });
  } catch (error) {
    console.error('Studio verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

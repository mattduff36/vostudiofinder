import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { StudioStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status } = await request.json();

    // Validate status
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE or INACTIVE' },
        { status: 400 }
      );
    }

    // Update the studio status
    const updatedStudio = await db.studio_profiles.update({
      where: { id },
      data: { status: status as StudioStatus },
      select: {
        id: true,
        status: true,
        name: true,
      }
    });

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
      message: `Studio status updated to ${status}: ${updatedStudio.name}`
    });

  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}


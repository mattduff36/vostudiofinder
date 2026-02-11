import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { status, priority, assigned_to } = await request.json();

    // Validate status
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolved_at = new Date();
      }
    }

    if (priority) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    // Update ticket
    const ticket = await db.support_tickets.update({
      where: { id },
      data: updateData,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
          },
        },
      },
    });

    logger.log(`Support ticket ${id} updated by admin ${session.user.id}`);

    return NextResponse.json({
      success: true,
      ticket,
    });

  } catch (error) {
    logger.error('Error updating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update support ticket' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Check admin authorization
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Delete the suggestion
    await db.support_tickets.delete({
      where: { id },
    });

    logger.log(`Support ticket ${id} deleted by admin ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Suggestion deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to delete suggestion' },
      { status: 500 }
    );
  }
}


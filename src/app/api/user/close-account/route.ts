import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { password, confirmation } = await request.json();

    // Validation
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (confirmation?.toLowerCase() !== 'delete my account') {
      return NextResponse.json(
        { error: 'Confirmation text does not match' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, email: true, deletion_status: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if account is already scheduled for deletion
    if (user.deletion_status === 'PENDING_DELETION') {
      return NextResponse.json(
        { error: 'Account is already scheduled for deletion' },
        { status: 400 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 401 }
      );
    }

    // Schedule deletion (7 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7);

    await prisma.users.update({
      where: { id: session.user.id },
      data: {
        deletion_requested_at: new Date(),
        deletion_scheduled_for: deletionDate,
        deletion_status: 'PENDING_DELETION',
        updated_at: new Date(),
      },
    });

    // Hide profile immediately
    await prisma.studio_profiles.updateMany({
      where: { user_id: session.user.id },
      data: {
        is_profile_visible: false,
        status: 'INACTIVE',
        updated_at: new Date(),
      },
    });

    logger.log(`✅ Account deletion scheduled for user: ${session.user.id}, deletion date: ${deletionDate.toISOString()}`);

    // TODO: Send email notification about account deletion
    // TODO: Cancel any active subscriptions

    return NextResponse.json({ 
      success: true,
      deletionDate: deletionDate.toISOString(),
    });

  } catch (error) {
    logger.error('Error scheduling account closure:', error);
    return NextResponse.json(
      { error: 'Failed to schedule account closure' },
      { status: 500 }
    );
  }
}


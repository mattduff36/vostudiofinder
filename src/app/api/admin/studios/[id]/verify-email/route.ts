import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/studios/[id]/verify-email
 * Force-verify the user email behind this studio (admin-only).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: studioId } = await params;

    const studio = await prisma.studio_profiles.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        user_id: true,
        users: {
          select: {
            id: true,
            email: true,
            email_verified: true,
          },
        },
      },
    });

    if (!studio || !studio.users) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // No-op if already verified, but still return success for idempotency
    if (studio.users.email_verified) {
      return NextResponse.json({
        success: true,
        user: {
          id: studio.users.id,
          email: studio.users.email,
          email_verified: true,
        },
        alreadyVerified: true,
      });
    }

    const updatedUser = await prisma.users.update({
      where: { id: studio.user_id },
      data: {
        email_verified: true,
        verification_token: null,
        verification_token_expiry: null,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        email_verified: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[Admin Verify Email] Error:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}


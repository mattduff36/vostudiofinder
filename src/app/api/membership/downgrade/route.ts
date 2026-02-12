import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { performDowngrade } from '@/lib/subscriptions/downgrade';

/**
 * POST /api/membership/downgrade
 * Immediately downgrade from Premium to Basic.
 * Applies all downgrade logic (profile changes, etc.).
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await performDowngrade(session.user.id);

    if (!result.downgraded && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.downgraded ? 'You have been downgraded to Basic.' : 'Already on Basic plan.',
    });
  } catch (error) {
    console.error('[Downgrade] Error:', error);
    return NextResponse.json(
      { error: 'Failed to downgrade' },
      { status: 500 }
    );
  }
}

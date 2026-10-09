import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { checkRateLimit, generateFingerprint, RATE_LIMITS } from '@/lib/rate-limiting';
import { evaluateActiveUsernameRepair } from '@/lib/signup/active-username-repair';
import { claimActiveUsername } from '@/lib/signup/claim-active-username';

/**
 * One-time username completion for an authenticated ACTIVE temp_/expired_ account.
 * The session user is the owner. A body userId is never sufficient on its own.
 */
export async function POST(request: NextRequest) {
  try {
    const fingerprint = generateFingerprint(request);
    const rateLimitResult = await checkRateLimit(fingerprint, RATE_LIMITS.RESERVE_USERNAME);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many username attempts. Please slow down.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    let body: { username?: unknown; userId?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const requestedUserId = typeof body.userId === 'string' ? body.userId : null;
    const sessionUserId = session?.user?.id ?? null;

    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await db.users.findUnique({
      where: { id: sessionUserId },
      select: { id: true, status: true, username: true },
    });

    const decision = evaluateActiveUsernameRepair({
      sessionUserId,
      requestedUserId,
      account: account
        ? { id: account.id, status: account.status, username: account.username }
        : null,
      proposedUsername: body.username,
    });

    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }

    const claimed = await claimActiveUsername(sessionUserId, decision.username);
    if (!claimed.ok) {
      return NextResponse.json(
        { error: claimed.error, available: claimed.available },
        { status: claimed.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Username @${decision.username} saved`,
      user: { id: sessionUserId, username: decision.username },
    });
  } catch (error) {
    console.error('Active username completion error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

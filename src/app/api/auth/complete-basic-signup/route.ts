import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch user with the fields needed for all verification checks
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        membership_tier: true,
        email_verified: true,
        reservation_expires_at: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // ── Gate 1: Must be in PENDING status ──────────────────────────────
    // Only PENDING users are eligible for activation. This prevents
    // re-activating EXPIRED users or double-activating ACTIVE users.
    if (user.status !== UserStatus.PENDING) {
      return NextResponse.json(
        { error: user.status === UserStatus.ACTIVE ? 'User is already active' : 'User signup has expired. Please register again.' },
        { status: 400 }
      );
    }

    // ── Gate 2: Email must be verified ─────────────────────────────────
    // Proves the user owns the email and completed the verification step.
    // Without this, an attacker with a userId could activate an account
    // whose owner never verified their email address.
    if (!user.email_verified) {
      return NextResponse.json(
        { error: 'Email must be verified before activating membership' },
        { status: 403 }
      );
    }

    // ── Gate 3: Reservation must still be valid ────────────────────────
    // Each signup has a finite window (reservation_expires_at). If that
    // window has passed, the signup flow has timed out and the account
    // should not be activatable via this endpoint.
    if (user.reservation_expires_at && user.reservation_expires_at < new Date()) {
      return NextResponse.json(
        { error: 'Signup reservation has expired. Please register again.' },
        { status: 410 }
      );
    }

    // All gates passed — activate the user with BASIC tier
    //
    // NOTE ON payment_attempted_at: This field is intentionally set for Basic
    // (free) users even though no payment occurs. It serves as a "membership
    // step completed" marker — NOT a literal payment indicator. Downstream
    // systems rely on its presence:
    //   1. auth-guards.ts (line ~134) uses `payment_attempted_at` being set to
    //      distinguish a user who explicitly chose the Basic tier from a
    //      brand-new registrant who also defaults to BASIC but never finished
    //      the signup flow.
    //   2. The engagement-email cron (/api/cron/send-engagement-emails) filters
    //      for `payment_attempted_at: null` to find users who haven't completed
    //      the membership selection step yet.
    // Removing or skipping this field for Basic users would break both systems.
    await db.users.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        membership_tier: 'BASIC',
        payment_attempted_at: new Date(), // See note above — intentional for free tier
        reservation_expires_at: null, // Clear reservation
      },
    });

    // Ensure studio profile exists so the user appears on /admin/studios immediately
    const { ensureStudioProfile } = await import('@/lib/studio-profile');
    await ensureStudioProfile(userId);

    console.log(`✅ User ${userId} activated with BASIC (free) membership`);

    return NextResponse.json({
      success: true,
      message: 'Basic membership activated successfully',
    });
  } catch (error) {
    console.error('Error completing basic signup:', error);
    return NextResponse.json(
      { error: 'Failed to complete signup' },
      { status: 500 }
    );
  }
}

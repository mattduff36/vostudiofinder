import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, generateFingerprint, RATE_LIMITS } from '@/lib/rate-limiting';
import { validateUsername } from '@/lib/utils/username';
import { getBaseUrl } from '@/lib/seo/site';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { pendingSignupEmailMatches, shouldSendVerificationAfterUsername } from '@/lib/signup/username-routing';
import { claimUsername } from '@/lib/signup/claim-active-username';

export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimit(generateFingerprint(request), RATE_LIMITS.RESERVE_USERNAME);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many username attempts. Please slow down.' }, { status: 429 });
    const { userId, username, email } = await request.json();
    if (typeof userId !== 'string' || !userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    const validation = validateUsername(username);
    if (!validation.ok) return NextResponse.json({ error: validation.message, available: false }, { status: 400 });
    const user = await db.users.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!pendingSignupEmailMatches(user.email, email)) return NextResponse.json({ error: 'Signup session does not match this account' }, { status: 403 });
    const result = await claimUsername(userId, validation.username, 'PENDING');
    if (!result.ok) return NextResponse.json({ error: result.error, available: result.available }, { status: result.status });
    if (shouldSendVerificationAfterUsername(user.username, user.email_verified) && user.verification_token) {
      try {
        await sendVerificationEmail(user.email, user.display_name, `${getBaseUrl(request)}/api/auth/verify-email?token=${user.verification_token}`);
      } catch { console.warn('[Signup] Verification delivery failed; resend remains available'); }
    }
    return NextResponse.json({
      message: `Username @${validation.username} reserved successfully`,
      user: { id: user.id, username: validation.username, reservation_expires_at: user.reservation_expires_at },
    });
  } catch (error) {
    console.error('[Signup] Username reservation failed', error);
    return NextResponse.json({ error: 'Unable to save username. Please try again.' }, { status: 500 });
  }
}

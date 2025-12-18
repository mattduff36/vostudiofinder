import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      console.warn('⚠️ No verification token provided');
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=invalid_token', request.url)
      );
    }

    console.log('🔐 Verifying email token...');

    // Find user with this verification token
    const user = await db.users.findFirst({
      where: {
        verification_token: token,
      },
    });

    if (!user) {
      console.warn('⚠️ Invalid verification token:', token);
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=invalid_token', request.url)
      );
    }

    // Check if token has expired
    if (user.verification_token_expiry && user.verification_token_expiry < new Date()) {
      console.warn('⚠️ Verification token expired for user:', user.email);
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=token_expired', request.url)
      );
    }

    // Check if already verified
    if (user.email_verified) {
      console.log('ℹ️ Email already verified for user:', user.email);
      return NextResponse.redirect(
        new URL('/auth/signin?verified=true&already=true', request.url)
      );
    }

    // Mark email as verified and clear verification token
    await db.users.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        verification_token: null,
        verification_token_expiry: null,
      },
    });

    console.log('✅ Email verified successfully for user:', user.email);

    // Redirect to signin with success message
    return NextResponse.redirect(
      new URL('/auth/signin?verified=true', request.url)
    );
  } catch (error) {
    console.error('❌ Email verification error:', error);
    handleApiError(error, 'Email verification failed');
    
    return NextResponse.redirect(
      new URL('/auth/verify-email?error=verification_failed', request.url)
    );
  }
}

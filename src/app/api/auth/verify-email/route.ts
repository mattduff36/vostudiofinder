import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const redirect = searchParams.get('redirect'); // Optional redirect after verification

    if (!token) {
      console.warn('[WARNING] No verification token provided');
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
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        email_verified: true,
        verification_token_expiry: true,
      },
    });

    if (!user) {
      console.warn('[WARNING] Invalid verification token:', token);
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=invalid_token', request.url)
      );
    }

    // Check if token has expired
    if (user.verification_token_expiry && user.verification_token_expiry < new Date()) {
      console.warn('[WARNING] Verification token expired for user:', user.email);
      return NextResponse.redirect(
        new URL(`/auth/verify-email?error=token_expired&email=${encodeURIComponent(user.email)}`, request.url)
      );
    }

    // Check if already verified
    if (user.email_verified) {
      console.log('[INFO] Email already verified for user:', user.email);
      
      // If redirect param provided, use it; otherwise go to payment
      if (redirect) {
        return NextResponse.redirect(new URL(redirect, request.url));
      }
      
      // Build payment URL with user data
      const paymentParams = new URLSearchParams();
      paymentParams.set('userId', user.id);
      paymentParams.set('email', user.email);
      paymentParams.set('name', user.display_name);
      if (user.username && !user.username.startsWith('temp_')) {
        paymentParams.set('username', user.username);
      }
      
      return NextResponse.redirect(
        new URL(`/auth/membership?${paymentParams.toString()}&already_verified=true`, request.url)
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

    console.log('[SUCCESS] Email verified successfully for user:', user.email);

    // If user already has a studio profile, automatically set it to visible
    // (Some flows create a studio profile before verification; others do not.)
    const studioProfile = await db.studio_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (studioProfile) {
      await db.studio_profiles.update({
        where: { id: studioProfile.id },
        data: { is_profile_visible: true },
      });
      console.log('[SUCCESS] Studio profile set to visible for user:', user.email);
    }

    // Determine redirect URL
    let redirectUrl: string;
    
    if (redirect) {
      // Use custom redirect if provided
      redirectUrl = redirect;
    } else {
      // Default: redirect to payment page with user data
      const paymentParams = new URLSearchParams();
      paymentParams.set('userId', user.id);
      paymentParams.set('email', user.email);
      paymentParams.set('name', user.display_name);
      if (user.username && !user.username.startsWith('temp_')) {
        paymentParams.set('username', user.username);
      }
      paymentParams.set('verified', 'true');
      
      redirectUrl = `/auth/membership?${paymentParams.toString()}`;
    }

    return NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
  } catch (error) {
    console.error('[ERROR] Email verification error:', error);
    handleApiError(error, 'Email verification failed');
    
    return NextResponse.redirect(
      new URL('/auth/verify-email?error=verification_failed', request.url)
    );
  }
}

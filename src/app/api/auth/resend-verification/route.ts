import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { getBaseUrl } from '@/lib/seo/site';

function sanitizeRedirectPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const { email, redirect } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const safeRedirect = sanitizeRedirectPath(redirect);

    console.log('📧 Resend verification request for:', normalizedEmail);

    // Find user
    const user = await db.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal whether the email exists for security
      return NextResponse.json(
        { 
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.'
        },
        { status: 200 }
      );
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db.users.update({
      where: { id: user.id },
      data: {
        verification_token: verificationToken,
        verification_token_expiry: verificationTokenExpiry,
      },
    });

    // Send verification email
    const verificationUrl = safeRedirect
      ? `${getBaseUrl(request)}/api/auth/verify-email?token=${verificationToken}&redirect=${encodeURIComponent(safeRedirect)}`
      : `${getBaseUrl(request)}/api/auth/verify-email?token=${verificationToken}`;
    
    const emailSent = await sendVerificationEmail(
      user.email,
      user.display_name,
      verificationUrl
    );

    if (!emailSent) {
      console.error('❌ Failed to send verification email to:', user.email);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    console.log('✅ Verification email resent successfully to:', user.email);

    return NextResponse.json(
      {
        success: true,
        message: 'Verification email sent! Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Resend verification email error:', error);
    handleApiError(error, 'Resend verification failed');
    
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}

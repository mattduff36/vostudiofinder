import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { getBaseUrl } from '@/lib/seo/site';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('📧 Resend verification request for:', email);

    // Find user
    const user = await db.users.findUnique({
      where: { email },
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
    const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${verificationToken}`;
    
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

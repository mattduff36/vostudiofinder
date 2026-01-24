import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { generateResetToken } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { sendEmail } from '@/lib/email/email-service';
import { generatePasswordResetEmail } from '@/lib/email/templates/password-reset';
import { getBaseUrl } from '@/lib/seo/site';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = forgotPasswordSchema.parse(body);
    
    // Check if user exists
    const user = await db.users.findUnique({
      where: { email: validatedData.email },
    });
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${validatedData.email}`);
      return NextResponse.json(
        {
          message: 'If an account with that email exists, we have sent a password reset link.',
        },
        { status: 200 }
      );
    }
    
    // Generate reset token
    const resetToken = await generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save reset token to database
    await db.users.update({
      where: { id: user.id },
      data: {
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        updated_at: new Date(),
      },
    });
    
    // Build reset URL
    const resetUrl = `${getBaseUrl(request)}/auth/reset-password?token=${resetToken}`;
    
    // Generate and send password reset email
    const { html, text } = generatePasswordResetEmail({
      resetUrl,
      userEmail: user.email,
    });
    
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - VoiceoverStudioFinder',
      html,
      text,
    });
    
    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
      // Still return success to prevent email enumeration
      // but log the error for debugging
    } else {
      console.log('Password reset email sent successfully to:', user.email);
    }
    
    return NextResponse.json(
      {
        message: 'If an account with that email exists, we have sent a password reset link.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


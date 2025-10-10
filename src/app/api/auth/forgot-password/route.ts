import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validations/auth';
// import { generateResetToken } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

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
      return NextResponse.json(
        {
          message: 'If an account with that email exists, we have sent a password reset link.',
        },
        { status: 200 }
      );
    }
    
    // Generate reset token
    // const resetToken = generateResetToken();
    // const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save reset token to database
    await db.users.update({
      where: { id: user.id },
      data: {
        // TODO: Add resetToken and resetTokenExpiry fields to User model
        // resetToken,
        // resetTokenExpiry,
      },
    });
    
    // TODO: Send password reset email
    // await sendPasswordResetEmail(user.email, resetToken);
    
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


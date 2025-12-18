import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword, isResetTokenValid } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = resetPasswordSchema.parse(body);
    
    // Find user by reset token
    const user = await db.users.findFirst({
      where: {
        reset_token: validatedData.token,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Check if token is expired
    if (!isResetTokenValid(user.reset_token_expiry)) {
      // Clear expired token
      await db.users.update({
        where: { id: user.id },
        data: {
          reset_token: null,
          reset_token_expiry: null,
          updated_at: new Date(),
        },
      });
      
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset link.' },
        { status: 400 }
      );
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Update user password and clear reset token
    await db.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date(),
      },
    });
    
    console.log(`Password reset successful for user: ${user.email}`);
    
    return NextResponse.json(
      {
        message: 'Password has been reset successfully. You can now sign in with your new password.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

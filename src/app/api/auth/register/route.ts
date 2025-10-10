import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validations/auth';
import { createUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = signupSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }
    
    // Create user
    const user = await createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: validatedData.displayName,
    });
    
    // TODO: Send verification email
    // await sendVerificationEmail(user.email, verificationToken);
    
    return NextResponse.json(
      {
        message: 'User created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


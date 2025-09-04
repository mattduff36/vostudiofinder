import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { signupSchema } from '@/lib/validations/auth';
import { createUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, ...userData } = body;
    
    // Validate input
    const validatedData = signupSchema.parse(userData);
    
    // Verify payment session first
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Payment verification required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not verified' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }
    
    // Create user with membership info
    const user = await createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: validatedData.displayName,
    });

    // Store membership information
    await db.user.update({
      where: { id: user.id },
      data: {
        role: 'STUDIO_OWNER', // Paid members are studio owners
        // Store subscription info in user metadata or separate table
        // This would depend on your schema design
      },
    });

    // Mark the session as used to prevent reuse
    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        account_created: 'true',
        user_id: user.id,
      },
    });
    
    // TODO: Send verification email
    // await sendVerificationEmail(user.email, verificationToken);
    
    return NextResponse.json(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Paid account creation error:', error);
    handleApiError(error, 'Paid account creation failed');
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

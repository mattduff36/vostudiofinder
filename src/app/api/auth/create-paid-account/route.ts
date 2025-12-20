import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { signupSchema } from '@/lib/validations/auth';
import { createUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, username, ...userData } = body;
    
    // Validate input
    const validatedData = signupSchema.parse(userData);
    
    // Verify payment session first
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Payment verification required' },
        { status: 400 }
      );
    }

    // DEVELOPMENT MODE: Skip Stripe verification for dev sessions
    const isDevMode = process.env.NODE_ENV === 'development' || sessionId.startsWith('cs_dev_');
    
    if (!isDevMode) {
      // PRODUCTION MODE: Verify with Stripe
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: 'Stripe configuration not available' },
          { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not verified' },
        { status: 400 }
      );
      }
    } else {
      console.log('🔧 DEV MODE: Skipping Stripe payment verification for account creation');
    }

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

    // Check if username is already taken (if provided) - case-insensitive
    if (username) {
      const existingUsername = await db.users.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
      });
      
      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
    }
    
    // Create user with membership info
    const user = await createUser({
      email: validatedData.email,
      password: validatedData.password,
      display_name: validatedData.display_name,
      username: username || undefined,
    });

    // Store membership information
    await db.users.update({
      where: { id: user.id },
      data: {
        role: 'STUDIO_OWNER', // Paid members are studio owners
        // Store subscription info in user metadata or separate table
        // This would depend on your schema design
      },
    });

    // Mark the session as used to prevent reuse (only in production)
    if (!isDevMode && process.env.STRIPE_SECRET_KEY) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        account_created: 'true',
        user_id: user.id,
      },
    });
    }
    
    // FUTURE: Send verification email
    // await sendVerificationEmail(user.email, verificationToken);
    
    return NextResponse.json(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
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


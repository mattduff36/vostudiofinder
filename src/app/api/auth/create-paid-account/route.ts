import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'crypto';
import { signupSchema } from '@/lib/validations/auth';
import { createUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { UserStatus } from '@prisma/client';
import { getBaseUrl } from '@/lib/seo/site';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, username, email, ...userData } = body;
    
    // Verify payment session first
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Payment verification required' },
        { status: 400 }
      );
    }

    // Check if user already exists BEFORE validation (to handle ACTIVE users without password)
    // Use email from body directly (not validated yet)
    const existingUser = await db.users.findUnique({
      where: { email: email?.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        verification_token: true,
        verification_token_expiry: true,
      },
    });
    
    // If user exists and is ACTIVE (webhook already processed), generate verification token and send email
    // Skip password validation for ACTIVE users since they already have an account
    if (existingUser && existingUser.status === UserStatus.ACTIVE) {
      console.log('✅ User already ACTIVE (webhook processed), generating verification token');
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user with new verification token
      await db.users.update({
        where: { id: existingUser.id },
        data: {
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
        },
      });
      
      // Send verification email
      const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
      
      try {
        const emailSent = await sendVerificationEmail(
          existingUser.email,
          existingUser.display_name,
          verificationUrl
        );
        
        if (emailSent) {
          console.log('✅ Verification email sent successfully to:', existingUser.email);
        } else {
          console.warn('⚠️ Failed to send verification email to:', existingUser.email);
        }
      } catch (emailError) {
        console.error('❌ Error sending verification email:', emailError);
        // Don't fail the request, email sending is non-critical
      }
      
      return NextResponse.json(
        {
          success: true,
          message: 'Verification email sent. Please check your email to verify your account.',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            display_name: existingUser.display_name,
            role: 'USER',
          },
        },
        { status: 200 }
      );
    }
    
    // If user exists but is not ACTIVE, return error (shouldn't happen in normal flow)
    if (existingUser && existingUser.status !== UserStatus.ACTIVE) {
      return NextResponse.json(
        { 
          error: 'Account already exists but is not active. Please contact support.',
          errorCode: 'ACCOUNT_EXISTS_NOT_ACTIVE',
          canRetry: false,
        },
        { status: 400 }
      );
    }

    // Now validate input for new user creation (password required)
    const validatedData = signupSchema.parse({ email, ...userData });

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
          { 
            error: 'Username is already taken',
            errorCode: 'USERNAME_TAKEN',
            canRetry: false,
          },
          { status: 400 }
        );
      }
    }
    
    try {
      // Create user and set verification token in a transaction
      // This ensures atomic operation - either everything succeeds or nothing persists
      const result = await db.$transaction(async (tx) => {
        // Create user with membership info (passing tx for atomicity)
        const user = await createUser({
          email: validatedData.email,
          password: validatedData.password,
          display_name: validatedData.display_name,
          username: username || undefined,
        }, tx);

        console.log('✅ User created:', user.id);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user with verification token and role
        await tx.users.update({
          where: { id: user.id },
          data: {
            role: 'USER', // All new accounts are regular users
            verification_token: verificationToken,
            verification_token_expiry: verificationTokenExpiry,
          },
        });

        console.log('✅ Verification token generated and saved');

        return { user, verificationToken };
      });

      // Mark the session as used to prevent reuse (only in production)
      // Do this AFTER successful user creation
      if (!isDevMode && process.env.STRIPE_SECRET_KEY) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          await stripe.checkout.sessions.update(sessionId, {
            metadata: {
              ...session.metadata,
              account_created: 'true',
              user_id: result.user.id,
            },
          });
          console.log('✅ Stripe session marked as used');
        } catch (stripeError) {
          console.error('⚠️ Failed to update Stripe session metadata:', stripeError);
          // Don't fail the request, this is non-critical
        }
      }
      
      // Send verification email
      const verificationUrl = `${getBaseUrl(request)}/api/auth/verify-email?token=${result.verificationToken}`;
      
      try {
        const emailSent = await sendVerificationEmail(
          result.user.email,
          result.user.display_name,
          verificationUrl
        );
        
        if (emailSent) {
          console.log('✅ Verification email sent successfully to:', result.user.email);
        } else {
          console.warn('⚠️ Failed to send verification email to:', result.user.email);
          // Don't fail the request, just log the warning
        }
      } catch (emailError) {
        console.error('❌ Error sending verification email:', emailError);
        // Don't fail the request, email sending is non-critical for account creation
      }
      
      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully. Please check your email to verify your account.',
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            display_name: result.user.display_name,
            role: result.user.role,
          },
        },
        { status: 201 }
      );
    } catch (txError: any) {
      // If transaction failed, user was not created or was rolled back
      console.error('❌ Transaction failed during user creation:', txError);
      
      // Check if error is due to unique constraint violation (P2002)
      if (txError.code === 'P2002') {
        const target = txError.meta?.target;
        
        if (target?.includes('email')) {
          return NextResponse.json(
            { 
              error: 'An account with this email already exists. Please sign in instead.',
              errorCode: 'EMAIL_EXISTS',
              canRetry: false,
            },
            { status: 409 }
          );
        }
        
        if (target?.includes('username')) {
          return NextResponse.json(
            { 
              error: 'This username is already taken. Please contact support if you believe this is an error.',
              errorCode: 'USERNAME_TAKEN',
              canRetry: false,
            },
            { status: 409 }
          );
        }
      }
      
      // For any other transaction error, user can retry
      throw txError;
    }
  } catch (error) {
    console.error('❌ Paid account creation error:', error);
    handleApiError(error, 'Paid account creation failed');
    
    // Validation errors
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { 
          error: 'The information provided is invalid. Please check your details and try again.',
          errorCode: 'VALIDATION_ERROR',
          canRetry: true,
        },
        { status: 400 }
      );
    }
    
    // Payment verification errors
    if (error instanceof Error && error.message.includes('Payment not')) {
      return NextResponse.json(
        { 
          error: 'Payment could not be verified. Please contact support with your order details.',
          errorCode: 'PAYMENT_VERIFICATION_FAILED',
          canRetry: false,
        },
        { status: 400 }
      );
    }
    
    // Database/server errors (user can retry)
    return NextResponse.json(
      { 
        error: 'We encountered a technical issue while creating your account. Please try again or contact support if the problem persists.',
        errorCode: 'SERVER_ERROR',
        canRetry: true,
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { sendVerificationEmail } from '@/lib/email/email-service';
import { UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { ZodError } from 'zod';
import { getBaseUrl } from '@/lib/seo/site';
import { checkRateLimit, generateFingerprint, RATE_LIMITS } from '@/lib/rate-limiting';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Check honeypot field (should be empty)
    if (body.website) {
      console.warn('[BOT] Honeypot field filled:', body.website);
      return NextResponse.json(
        { error: 'Invalid submission' },
        { status: 400 }
      );
    }

    // Check rate limit BEFORE Turnstile verification (cheaper)
    const fingerprint = generateFingerprint(request, body.email);
    const rateLimitResult = await checkRateLimit(fingerprint, RATE_LIMITS.SIGNUP);
    
    if (!rateLimitResult.allowed) {
      const minutesUntilReset = Math.ceil(
        (rateLimitResult.resetAt.getTime() - Date.now()) / (1000 * 60)
      );
      console.warn(`[RATE_LIMIT] Signup blocked for ${fingerprint}, resets in ${minutesUntilReset}m`);
      return NextResponse.json(
        { 
          error: `Too many signup attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`,
        },
        { status: 429 }
      );
    }

    // Verify Turnstile token (server-side)
    // The bypass decision is made entirely server-side using server-only env vars.
    // No magic token or client-side environment detection is required.
    const turnstileToken = body.turnstileToken;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTest = process.env.NODE_ENV === 'test';
    // VERCEL_ENV is server-only (NOT exposed via NEXT_PUBLIC_), so attackers
    // cannot detect preview environments from client-side code.
    const isPreviewDeploy = process.env.VERCEL_ENV === 'preview';
    
    if (isDevelopment || isTest) {
      // Local dev/test: skip Turnstile entirely
      console.warn('[Turnstile] Development/test mode: bypassing security check');
    } else if (isPreviewDeploy) {
      // Preview deployment: skip Turnstile entirely (server-side decision only).
      // Rate limiting and honeypot checks above still apply.
      console.warn('[Turnstile] Preview deployment: bypassing security check (server-side)');
    } else {
      // Production: require valid Turnstile token
      if (!turnstileToken) {
        console.warn('[BOT] Missing Turnstile token');
        return NextResponse.json(
          { error: 'Security verification required' },
          { status: 400 }
        );
      }

      // Verify with Cloudflare
      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      if (!turnstileSecret) {
        console.error('[ERROR] TURNSTILE_SECRET_KEY not configured');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: request.headers.get('cf-connecting-ip') || 
                    request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip'),
        }),
      });

      const turnstileResult = await turnstileResponse.json();
      
      if (!turnstileResult.success) {
        console.warn('[BOT] Turnstile verification failed:', turnstileResult['error-codes']);
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.' },
          { status: 400 }
        );
      }

      console.log('✅ Turnstile verification passed');
    }
    
    // Validate input using server-side schema (no confirmPassword or acceptTerms)
    let validatedData;
    try {
      validatedData = registerSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Invalid input data', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }
    
    // Normalize email to lowercase
    const normalizedEmail = validatedData.email.toLowerCase().trim();
    
    // Sanitize display_name to prevent XSS
    const sanitizedDisplayName = validatedData.display_name
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
    
    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email: normalizedEmail },
    });
    
    if (existingUser) {
      // If user is EXPIRED, allow them to re-register with a new account
      if (existingUser.status === UserStatus.EXPIRED) {
        // Delete the expired user and their old reservation
        // Use deleteMany to avoid race condition if another request already deleted it
        const deleteResult = await db.users.deleteMany({
          where: { 
            id: existingUser.id,
            status: UserStatus.EXPIRED, // Extra safety: only delete if still EXPIRED
          },
        });
        console.log(`[INFO] Deleted ${deleteResult.count} EXPIRED user(s) with email: ${normalizedEmail}`);
      } else if (existingUser.status === UserStatus.PENDING) {
        // User has incomplete signup - check if reservation is still valid
        const now = new Date();
        const isExpired = existingUser.reservation_expires_at && existingUser.reservation_expires_at < now;
        
        if (isExpired) {
          // Mark as EXPIRED and free up username, then delete like other EXPIRED users
          const expiredUsername = `expired_${existingUser.username}_${Date.now()}_${existingUser.id.substring(0, 4)}`;
          await db.users.update({
            where: { id: existingUser.id },
            data: {
              status: UserStatus.EXPIRED,
              username: expiredUsername,
              updated_at: new Date(),
            },
          });
          console.log(`⏰ Expired PENDING user: ${existingUser.email} (ID: ${existingUser.id})`);
          
          // Delete the expired user to allow new signup (same as EXPIRED handling above)
          const deleteResult = await db.users.deleteMany({
            where: { 
              id: existingUser.id,
              status: UserStatus.EXPIRED, // Extra safety: only delete if still EXPIRED
            },
          });
          console.log(`[INFO] Deleted ${deleteResult.count} expired PENDING user(s) with email: ${normalizedEmail}`);
          // Continue to create new user below
        } else {
          // Reservation still valid - check signup progress
          const hasRealUsername = existingUser.username && !existingUser.username.startsWith('temp_');
          
          // Check if payment exists
          const payment = await db.payments.findFirst({
            where: { user_id: existingUser.id },
            orderBy: { created_at: 'desc' },
          });
          
          const hasPayment = payment?.status === 'SUCCEEDED';
          const sessionId = payment?.stripe_checkout_session_id || null;
          
          // Determine resume step
          let resumeStep: 'username' | 'payment' | 'profile' = 'username';
          if (hasPayment) {
            resumeStep = 'profile';
          } else if (hasRealUsername) {
            resumeStep = 'payment';
          }
          
          // Calculate time remaining until reservation expires
          // Use the 'now' variable already declared above (line 35)
          let timeRemaining = { days: 0, hours: 0, total: 0 };
          if (existingUser.reservation_expires_at) {
            const expiresAt = new Date(existingUser.reservation_expires_at);
            const diffMs = expiresAt.getTime() - now.getTime();
            
            if (diffMs > 0) {
              const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
              const days = Math.floor(totalHours / 24);
              const hours = totalHours % 24;
              
              timeRemaining = {
                days,
                hours,
                total: totalHours,
              };
            }
          }
          
          console.log(`🔄 PENDING user found: ${existingUser.email}, can resume from step: ${resumeStep}`);
          
          return NextResponse.json(
            {
              canResume: true,
              resumeStep,
              hasUsername: hasRealUsername,
              hasPayment,
              sessionId, // Include sessionId for profile step navigation
              user: {
                id: existingUser.id,
                email: existingUser.email,
                username: hasRealUsername ? existingUser.username : null,
                display_name: existingUser.display_name,
                status: existingUser.status,
                reservation_expires_at: existingUser.reservation_expires_at,
              },
              timeRemaining,
              message: 'You have an incomplete signup. Would you like to continue?',
            },
            { status: 200 }
          );
        }
      } else {
        // User is ACTIVE - cannot re-register
        return NextResponse.json(
          { error: 'User already exists with this email' },
          { status: 400 }
        );
      }
    }
    
    // Create PENDING user (placeholder) with 7-day reservation
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Pre-create guard: verify bcrypt produced a valid hash before touching the DB.
    // A valid bcrypt hash is always 60 chars and starts with "$2a$" or "$2b$".
    if (
      !hashedPassword ||
      hashedPassword.length !== 60 ||
      !hashedPassword.startsWith('$2')
    ) {
      console.error(
        `[CRITICAL] Password hashing produced invalid output for ${normalizedEmail}:`,
        `type=${typeof hashedPassword}, length=${hashedPassword?.length ?? 'null'}`
      );
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 }
      );
    }
    
    const userId = randomBytes(12).toString('base64url');
    const reservationExpires = new Date();
    reservationExpires.setDate(reservationExpires.getDate() + 7); // 7 days from now
    
    // Generate temporary username (will be updated during username selection)
    // Replace hyphens with underscores to comply with username validation regex
    const tempUsername = `temp_${userId.substring(0, 8).replace(/-/g, '_')}`;
    
    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Use a transaction so the user is rolled back if password persistence fails
    const user = await db.$transaction(async (tx) => {
      const created = await tx.users.create({
        data: {
          id: userId,
          email: normalizedEmail,
          password: hashedPassword,
          username: tempUsername,
          display_name: sanitizedDisplayName,
          status: UserStatus.PENDING,
          reservation_expires_at: reservationExpires,
          email_verified: false,
          verification_token: verificationToken,
          verification_token_expiry: verificationTokenExpiry,
          updated_at: new Date(),
        },
      });
      
      // Post-create guard: re-read from DB to confirm the password was persisted
      const persisted = await tx.users.findUnique({
        where: { id: created.id },
        select: { password: true },
      });
      
      if (!persisted?.password || persisted.password.length !== 60) {
        console.error(
          `[CRITICAL] Password not persisted for user ${created.id} (${normalizedEmail}).`,
          `Expected 60-char hash, got length=${persisted?.password?.length ?? 'null'}.`,
          'Rolling back user creation.'
        );
        throw new Error('Password persistence verification failed');
      }
      
      return created;
    });
    
    console.log(`✅ Created PENDING user: ${user.email} (ID: ${user.id}), reservation expires: ${reservationExpires.toISOString()}`);
    
    // Send verification email immediately
    const verificationUrl = `${getBaseUrl(request)}/api/auth/verify-email?token=${verificationToken}`;
    
    try {
      const emailSent = await sendVerificationEmail(
        user.email,
        user.display_name,
        verificationUrl
      );
      
      if (emailSent) {
        console.log('✅ Verification email sent successfully to:', user.email);
      } else {
        console.warn('[WARNING] Failed to send verification email to:', user.email);
      }
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Don't fail the request, email sending is non-critical for account creation
    }
    
    return NextResponse.json(
      {
        message: 'Account created. Please verify your email to continue.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          status: user.status,
          reservation_expires_at: user.reservation_expires_at,
          email_verified: false,
        },
        verificationEmailSent: true,
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
    
    if (error instanceof Error && error.message === 'Password persistence verification failed') {
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


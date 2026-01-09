import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { ZodError } from 'zod';

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
        console.log(`🗑️ Deleted ${deleteResult.count} EXPIRED user(s) with email: ${normalizedEmail}`);
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
          console.log(`🗑️ Deleted ${deleteResult.count} expired PENDING user(s) with email: ${normalizedEmail}`);
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
    const userId = randomBytes(12).toString('base64url');
    const reservationExpires = new Date();
    reservationExpires.setDate(reservationExpires.getDate() + 7); // 7 days from now
    
    // Generate temporary username (will be updated during username selection)
    // Replace hyphens with underscores to comply with username validation regex
    const tempUsername = `temp_${userId.substring(0, 8).replace(/-/g, '_')}`;
    
    const user = await db.users.create({
      data: {
        id: userId,
        email: normalizedEmail,
        password: hashedPassword,
        username: tempUsername,
        display_name: sanitizedDisplayName,
        status: UserStatus.PENDING,
        reservation_expires_at: reservationExpires,
        email_verified: false,
        updated_at: new Date(),
      },
    });
    
    console.log(`✅ Created PENDING user: ${user.email} (ID: ${user.id}), reservation expires: ${reservationExpires.toISOString()}`);
    
    return NextResponse.json(
      {
        message: 'Account created. Please select your username.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          status: user.status,
          reservation_expires_at: user.reservation_expires_at,
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


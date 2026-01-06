import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

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
      // If user is EXPIRED, allow them to re-register with a new account
      if (existingUser.status === UserStatus.EXPIRED) {
        // Delete the expired user and their old reservation
        await db.users.delete({
          where: { id: existingUser.id },
        });
      } else {
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
    const tempUsername = `temp_${userId.substring(0, 8)}`;
    
    const user = await db.users.create({
      data: {
        id: userId,
        email: validatedData.email,
        password: hashedPassword,
        username: tempUsername,
        display_name: validatedData.display_name,
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


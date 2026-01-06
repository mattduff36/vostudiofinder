import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { UserStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username } = body;

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'User ID and username are required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters (letters, numbers, underscores only)' },
        { status: 400 }
      );
    }

    // Check if user exists and is PENDING
    const user = await db.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.status !== UserStatus.PENDING) {
      return NextResponse.json(
        { error: 'User account is not in PENDING status' },
        { status: 400 }
      );
    }

    // Check if reservation has expired
    if (user.reservation_expires_at && user.reservation_expires_at < new Date()) {
      // Mark user as EXPIRED
      await db.users.update({
        where: { id: userId },
        data: {
          status: UserStatus.EXPIRED,
          updated_at: new Date(),
        },
      });

      return NextResponse.json(
        { error: 'Username reservation has expired. Please sign up again.' },
        { status: 410 }
      );
    }

    // Check if username is already taken (excluding this user's temp username)
    const existingUsername = await db.users.findUnique({
      where: { username },
    });

    if (existingUsername && existingUsername.id !== userId) {
      // Check if the existing user's reservation is expired
      if (
        existingUsername.status === UserStatus.PENDING &&
        existingUsername.reservation_expires_at &&
        existingUsername.reservation_expires_at < new Date()
      ) {
        // Mark expired user as EXPIRED
        await db.users.update({
          where: { id: existingUsername.id },
          data: {
            status: UserStatus.EXPIRED,
            updated_at: new Date(),
          },
        });
        // Username is now available
      } else {
        return NextResponse.json(
          { error: 'Username is already taken', available: false },
          { status: 409 }
        );
      }
    }

    // Update user with selected username
    const updatedUser = await db.users.update({
      where: { id: userId },
      data: {
        username,
        updated_at: new Date(),
      },
    });

    console.log(`✅ Username reserved: ${username} for user ${userId} (expires: ${updatedUser.reservation_expires_at?.toISOString()})`);

    return NextResponse.json(
      {
        message: `Username @${username} reserved successfully`,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          reservation_expires_at: updatedUser.reservation_expires_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Username reservation error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


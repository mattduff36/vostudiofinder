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
      // Mark user as EXPIRED and clear their username (consistent with cron job)
      const expiredUsername = `expired_${user.username}_${Date.now()}_${userId.substring(0, 4)}`;
      await db.users.update({
        where: { id: userId },
        data: {
          status: UserStatus.EXPIRED,
          username: expiredUsername, // Free up the username
          updated_at: new Date(),
        },
      });

      console.log(`✅ Expired current user: ${user.username} → ${expiredUsername} (${userId})`);

      return NextResponse.json(
        { error: 'Username reservation has expired. Please sign up again.' },
        { status: 410 }
      );
    }

    // Check if username is already taken (excluding this user and EXPIRED users)
    // Consistent with check-username endpoint behavior
    const existingUsername = await db.users.findFirst({
      where: {
        username,
        status: {
          not: UserStatus.EXPIRED, // Exclude already-expired reservations
        },
      },
    });

    if (existingUsername && existingUsername.id !== userId) {
      // Check if the existing PENDING user's reservation has just expired
      if (
        existingUsername.status === UserStatus.PENDING &&
        existingUsername.reservation_expires_at &&
        existingUsername.reservation_expires_at < new Date()
      ) {
        // Use transaction to atomically free old username and claim it for current user
        // This prevents race conditions where another request claims it in between
        try {
          const updatedUser = await db.$transaction(async (tx) => {
            // Step 1: Free the expired user's username
            const expiredUsername = `expired_${existingUsername.username}_${Date.now()}`;
            await tx.users.update({
              where: { id: existingUsername.id },
              data: {
                status: UserStatus.EXPIRED,
                username: expiredUsername, // Free up the username
                updated_at: new Date(),
              },
            });

            // Step 2: Immediately claim it for current user (atomic!)
            const updated = await tx.users.update({
              where: { id: userId },
              data: {
                username,
                updated_at: new Date(),
              },
            });

            console.log(`✅ Freed and claimed username: ${existingUsername.username} (${existingUsername.id} → ${expiredUsername}, claimed by ${userId})`);
            return updated;
          });

          // Transaction succeeded - username claimed
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
        } catch (error: any) {
          // Handle unique constraint violation (race condition with another transaction)
          if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
            console.error(`⚠️  Race condition: Username ${username} claimed during transaction`);
            return NextResponse.json(
              { error: 'Username was just claimed by another user. Please select a different username.', available: false },
              { status: 409 }
            );
          }
          // Re-throw other errors
          throw error;
        }
      } else {
        // Username is taken by an active user or pending user with valid reservation
        return NextResponse.json(
          { error: 'Username is already taken', available: false },
          { status: 409 }
        );
      }
    }

    // Update user with selected username (no conflict, direct update)
    // Wrap in try-catch to handle race condition (unique constraint violation)
    let updatedUser;
    try {
      updatedUser = await db.users.update({
        where: { id: userId },
        data: {
          username,
          updated_at: new Date(),
        },
      });
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        console.error(`⚠️  Race condition: Username ${username} claimed by another request`);
        return NextResponse.json(
          { error: 'Username was just claimed by another user. Please select a different username.', available: false },
          { status: 409 }
        );
      }
      // Re-throw other errors
      throw error;
    }

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


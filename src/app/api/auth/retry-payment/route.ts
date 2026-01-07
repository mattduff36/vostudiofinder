import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { handleApiError } from '@/lib/sentry';

/**
 * Retry Payment API
 * Allows PENDING users to retry their payment after a failed attempt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check user status
    if (user.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'User already has an active membership' },
        { status: 400 }
      );
    }

    if (user.status === UserStatus.EXPIRED) {
      return NextResponse.json(
        { 
          error: 'Username reservation has expired',
          expired: true,
          message: 'Please sign up again to reserve a new username'
        },
        { status: 410 }
      );
    }

    // Check if reservation has expired
    if (user.reservation_expires_at && user.reservation_expires_at < new Date()) {
      // Mark as expired
      await db.users.update({
        where: { id: userId },
        data: {
          status: UserStatus.EXPIRED,
          updated_at: new Date(),
        },
      });

      return NextResponse.json(
        { 
          error: 'Username reservation has expired',
          expired: true,
          message: 'Please sign up again to reserve a new username'
        },
        { status: 410 }
      );
    }

    // Optional: Verify secure token if provided (for email links)
    // This adds an extra layer of security for retry links in emails
    if (token) {
      // In a production system, you'd verify a secure token here
      // For now, we'll skip token verification
      // TODO: Implement secure token system for email retry links
    }

    // Extend reservation by 2 days (up to max 14 days total)
    const now = new Date();
    const createdAt = user.created_at;
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const maxReservationDays = 14;

    // If user has exceeded max reservation period, mark as EXPIRED
    if (daysSinceCreation >= maxReservationDays) {
      await db.users.update({
        where: { id: userId },
        data: {
          status: UserStatus.EXPIRED,
          updated_at: now,
        },
      });

      console.log(`❌ Reservation expired for ${user.email} (${daysSinceCreation} days since creation)`);

      return NextResponse.json(
        {
          error: 'Your username reservation has expired. Please sign up again.',
          expired: true,
          daysSinceCreation,
          maxDays: maxReservationDays,
        },
        { status: 410 } // 410 Gone
      );
    }

    // Extend reservation by 2 days (within max period)
    const newExpiry = new Date(user.reservation_expires_at || now);
    newExpiry.setDate(newExpiry.getDate() + 2); // Extend by 2 days

    // Don't exceed max reservation period
    const maxExpiry = new Date(createdAt);
    maxExpiry.setDate(maxExpiry.getDate() + maxReservationDays);

    const finalExpiry = newExpiry > maxExpiry ? maxExpiry : newExpiry;

    await db.users.update({
      where: { id: userId },
      data: {
        reservation_expires_at: finalExpiry,
        updated_at: now,
      },
    });

    console.log(`✅ Extended reservation for ${user.email} to ${finalExpiry.toISOString()}`);

    const currentExpiry = finalExpiry;

    // Return user data for retry with the UPDATED expiration date
    return NextResponse.json(
      {
        message: 'Ready to retry payment',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          reservation_expires_at: currentExpiry, // Use the updated value
          payment_retry_count: user.payment_retry_count,
        },
        checkoutUrl: `/auth/membership?userId=${user.id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.display_name)}&username=${encodeURIComponent(user.username)}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Retry payment error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET endpoint - Redirects user to payment page (for email links)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.redirect(new URL('/auth/signup', request.url));
    }

    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        reservation_expires_at: true,
        payment_attempted_at: true,
        payment_retry_count: true,
      },
    });

    if (!user) {
      // User not found - redirect to signup
      return NextResponse.redirect(new URL('/auth/signup', request.url));
    }

    const now = new Date();
    const isExpired = user.reservation_expires_at && user.reservation_expires_at < now;

    // If already active, redirect to dashboard/home
    if (user.status === UserStatus.ACTIVE) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If expired, mark as EXPIRED and redirect to signup
    if (isExpired || user.status === UserStatus.EXPIRED) {
      if (user.status !== UserStatus.EXPIRED) {
        await db.users.update({
          where: { id: userId },
          data: {
            status: UserStatus.EXPIRED,
            updated_at: now,
          },
        });
      }
      return NextResponse.redirect(new URL('/auth/signup?expired=true', request.url));
    }

    // User is PENDING and reservation valid - redirect to payment page
    const checkoutUrl = `/auth/membership?userId=${user.id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.display_name)}&username=${encodeURIComponent(user.username)}`;
    return NextResponse.redirect(new URL(checkoutUrl, request.url));
  } catch (error) {
    console.error('Retry payment redirect error:', error);
    // On error, redirect to signup
    return NextResponse.redirect(new URL('/auth/signup', request.url));
  }
}


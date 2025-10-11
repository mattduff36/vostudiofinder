import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const responseSchema = z.object({
  content: z.string().min(1).max(500),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reviewId } = await params;
    const body = await request.json();
    const { content } = responseSchema.parse(body);

    // Get the review and verify ownership
    const review = await db.reviews.findUnique({
      where: { id: reviewId },
      include: {
        studios: {
          select: {
            owner_id: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Only studio owner can respond
    if (review.studios.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the studio owner can respond to reviews' },
        { status: 403 }
      );
    }

    // Check if response already exists
    const existingResponse = await db.review_responses.findUnique({
      where: { review_id: reviewId },
    });

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Response already exists for this review' },
        { status: 400 }
      );
    }

    // Create the response
    const response = await db.review_responses.create({
      data: {
        id: randomBytes(12).toString('base64url'), // Generate unique ID
        review_id: reviewId,
        content,
        author_id: session.user.id,
        updated_at: new Date(), // Add required timestamp
      },
    });

    // Notify the reviewer
    // TODO: Implement notification system
    // await NotificationService.notifyReviewResponse(
    //   review.reviewerId,
    //   session.user.displayName,
    //   review.studioId
    // );

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Error creating review response:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create response' },
      { status: 500 }
    );
  }
}

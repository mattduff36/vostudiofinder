import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const createReviewSchema = z.object({
  studioId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  content: z.string().min(10).max(2000),
  isAnonymous: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validatedData = createReviewSchema.parse(body);
    
    // Check if studio exists and is active
    const studio = await db.studios.findUnique({
      where: { 
        id: validatedData.studioId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
      },
    });
    
    if (!studio) {
      return NextResponse.json(
        { error: 'Studio not found' },
        { status: 404 }
      );
    }
    
    // Prevent users from reviewing their own studios
    if (studio.owner_id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot review your own studio' },
        { status: 400 }
      );
    }
    
    // Check if user has already reviewed this studio
    const existingReview = await db.review.findFirst({
      where: {
        studioId: validatedData.studioId,
        reviewerId: session.user.id,
      },
    });
    
    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this studio' },
        { status: 400 }
      );
    }
    
    // Create the review
    const review = await db.review.create({
      data: {
        studioId: validatedData.studioId,
        reviewerId: session.user.id,
        owner_id: studio.owner_id,
        rating: validatedData.rating,
        content: validatedData.content,
        isAnonymous: validatedData.isAnonymous,
        status: 'PENDING', // Reviews need moderation
      },
      include: {
        reviewer: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
        studio: {
          select: {
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(
      {
        message: 'Review submitted successfully. It will be published after moderation.',
        review: {
          id: review.id,
          rating: review.rating,
          content: review.content,
          isAnonymous: review.isAnonymous,
          status: review.status,
          created_at: review.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Review creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid review data', details: error.issues },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!studioId) {
      return NextResponse.json(
        { error: 'Studio ID is required' },
        { status: 400 }
      );
    }
    
    const skip = (page - 1) * limit;
    
    const [reviews, totalCount] = await Promise.all([
      db.review.findMany({
        where: {
          studioId,
          status: 'APPROVED',
        },
        include: {
          reviewer: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      db.review.count({
        where: {
          studioId,
          status: 'APPROVED',
        },
      }),
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

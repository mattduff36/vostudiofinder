import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, SubscriptionPlan } from '@/lib/stripe';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const checkoutSchema = z.object({
  plan: z.enum(['PREMIUM_YEARLY']),
  studioId: z.string().cuid(),
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
    const { plan, studioId } = checkoutSchema.parse(body);
    
    // Verify studio ownership
    const studio = await db.studio.findUnique({
      where: { 
        id: studioId,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        isPremium: true,
      },
    });
    
    if (!studio) {
      return NextResponse.json(
        { error: 'Studio not found or access denied' },
        { status: 404 }
      );
    }
    
    if (studio.isPremium) {
      return NextResponse.json(
        { error: 'Studio already has premium subscription' },
        { status: 400 }
      );
    }
    
    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession({
      plan: plan as SubscriptionPlan,
      userId: session.user.id,
      studioId,
      successUrl: `${process.env.NEXTAUTH_URL}/studio/${studioId}?payment=success`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/studio/${studioId}?payment=cancelled`,
    });
    
    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

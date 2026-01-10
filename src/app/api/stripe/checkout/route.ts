import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, SubscriptionPlan } from '@/lib/stripe';
import { db } from '@/lib/db';
// import { VATService } from '@/lib/vat';
import { handleApiError } from '@/lib/sentry';
import { getBaseUrl } from '@/lib/seo/site';

const checkoutSchema = z.object({
  plan: z.enum(['PREMIUM_YEARLY']),
  studio_id: z.string().cuid(),
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
    const { plan, studio_id } = checkoutSchema.parse(body);
    
    // Verify studio ownership
    const studio = await db.studio_profiles.findUnique({
      where: { 
        id: studio_id,
        user_id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        is_premium: true,
        users: {
          select: {
            username: true,
          },
        },
      },
    });
    
    if (!studio) {
      return NextResponse.json(
        { error: 'Studio not found or access denied' },
        { status: 404 }
      );
    }
    
    if (studio.is_premium) {
      return NextResponse.json(
        { error: 'Studio already has premium subscription' },
        { status: 400 }
      );
    }
    
    // Create Stripe checkout session
    const baseUrl = getBaseUrl(request);
    const checkoutSession = await createCheckoutSession({
      plan: plan as SubscriptionPlan,
      user_id: session.user.id,
      studio_id,
      successUrl: `${baseUrl}/${studio.users.username}?payment=success`,
      cancelUrl: `${baseUrl}/${studio.users.username}?payment=cancelled`,
    });
    
    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


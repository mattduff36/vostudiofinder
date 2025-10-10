import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { paypal } from '@/lib/paypal';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studioId } = await request.json();

    if (!studioId) {
      return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
    }

    // Verify studio ownership
    const studio = await db.studios.findUnique({
      where: {
        id: studioId,
        owner_id: session.user.id,
      },
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Get or create PayPal plan ID
    let planId = process.env.PAYPAL_PLAN_ID;
    
    if (!planId) {
      // Create product and plan if not exists
      const productId = await paypal.createProduct(
        'Premium Studio Subscription',
        'Annual premium subscription for voiceover studio listings'
      );

      planId = await paypal.createSubscriptionPlan(productId, {
        id: '',
        name: 'Premium Studio Subscription',
        description: 'Annual premium subscription for enhanced studio features',
        amount: 25, // £25 per year
        currency: 'GBP',
        interval: 'year',
      });
    }

    // Create PayPal subscription
    const subscription = await paypal.createSubscription({
      planId,
      user_id: session.user.id,
      studio_id: studioId,
    });

    // Find approval URL
    const approvalUrl = subscription.links?.find(
      (link: any) => link.rel === 'approve'
    )?.href;

    if (!approvalUrl) {
      throw new Error('No approval URL found in PayPal response');
    }

    // Store pending subscription in database
    await db.pending_subscriptions.create({
      data: {
        user_id: session.user.id,
        studioId,
        paypal_subscription_id: subscription.id,
        status: 'PENDING_APPROVAL',
        paymentMethod: 'PAYPAL',
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      approvalUrl,
    });
  } catch (error) {
    console.error('PayPal checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal subscription' },
      { status: 500 }
    );
  }
}



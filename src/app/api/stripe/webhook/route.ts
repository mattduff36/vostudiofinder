import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handleSubscriptionSuccess, handleSubscriptionCancellation } from '@/lib/stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Construct and verify webhook event
    const event = constructWebhookEvent(body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        if (session.mode === 'subscription') {
          console.log('Checkout session completed for subscription:', session.id);
          
          // The subscription will be handled in the subscription.created event
          // Here we can update any checkout-specific data if needed
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        
        await handleSubscriptionSuccess(subscription);
        
        // Update database
        const { userId, studioId } = subscription.metadata;
        
        if (userId && studioId) {
          await db.$transaction(async (tx) => {
            // Create subscription record
            await tx.subscription.create({
              data: {
                userId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                status: subscription.status.toUpperCase() as any,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              },
            });
            
            // Update studio to premium
            await tx.studio.update({
              where: { id: studioId },
              data: { isPremium: true },
            });
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Update subscription in database
        await db.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status.toUpperCase() as any,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await handleSubscriptionCancellation(subscription);
        
        // Update database
        await db.$transaction(async (tx) => {
          // Update subscription status
          await tx.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
            },
          });
          
          // Remove premium status from studio
          const sub = await tx.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
            include: { user: { include: { studios: true } } },
          });
          
          if (sub) {
            await tx.studio.updateMany({
              where: { ownerId: sub.userId },
              data: { isPremium: false },
            });
          }
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Payment succeeded for invoice:', invoice.id);
        
        // Handle successful payment
        // You could send confirmation emails here
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);
        
        // Handle failed payment
        // You could send notification emails here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

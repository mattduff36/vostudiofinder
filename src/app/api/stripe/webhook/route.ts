import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handleSubscriptionSuccess, handleSubscriptionCancellation, stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email/email-service';
import { paymentSuccessTemplate, paymentFailedTemplate } from '@/lib/email/templates/payment-success';

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
                currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
                currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
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
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
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
        
        // Get customer details
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted) {
          // Send payment success email
          const emailData = {
            customerName: customer.name || customer.email || 'Valued Customer',
            amount: (invoice.amount_paid / 100).toFixed(2),
            currency: invoice.currency,
            invoiceNumber: invoice.number || invoice.id || 'N/A',
            planName: 'Premium Studio Subscription',
            nextBillingDate: new Date((invoice.lines.data[0]?.period?.end || Math.floor(Date.now() / 1000)) * 1000).toLocaleDateString(),
          };

          await sendEmail({
            to: customer.email!,
            subject: 'Payment Confirmation - VoiceoverStudioFinder',
            html: paymentSuccessTemplate(emailData),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);
        
        // Get customer details
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted) {
          // Send payment failed email
          const retryDate = (invoice as any).next_payment_attempt ? new Date((invoice as any).next_payment_attempt * 1000).toLocaleDateString() : undefined;
          const emailData = {
            customerName: customer.name || customer.email || 'Valued Customer',
            amount: (invoice.amount_due / 100).toFixed(2),
            currency: invoice.currency,
            reason: 'Your payment method was declined. Please check your card details and try again.',
            ...(retryDate && { retryDate }),
          };

          await sendEmail({
            to: customer.email!,
            subject: 'Payment Failed - VoiceoverStudioFinder',
            html: paymentFailedTemplate(emailData),
          });
        }
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

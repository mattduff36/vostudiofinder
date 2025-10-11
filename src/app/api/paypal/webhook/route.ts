import { NextRequest, NextResponse } from 'next/server';
// import { paypal } from '@/lib/paypal';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/email-service';
import { paymentSuccessTemplate, paymentFailedTemplate } from '@/lib/email/templates/payment-success';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`PayPal webhook received: ${eventType}`);

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscriptionId = resource.id;
        
        // Update subscription status in database
        await db.subscriptions.update({
          where: { paypal_subscription_id: subscriptionId },
          data: { 
            status: 'ACTIVE',
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });

        // Send confirmation email
        const subscription = await db.subscriptions.findUnique({
          where: { paypal_subscription_id: subscriptionId },
          include: { users: true },
        });

        if (subscription?.users?.email) {
          await sendEmail({
            to: subscription.users.email,
            subject: 'Subscription Activated - VoiceoverStudioFinder',
            html: paymentSuccessTemplate({
              customerName: subscription.users.display_name,
              amount: '25.00',
              currency: 'GBP',
              invoiceNumber: subscriptionId,
              planName: 'Premium Studio Subscription',
              nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            }),
          });
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const subscriptionId = resource.id;
        
        // Update subscription and studio status
        await db.$transaction(async (tx) => {
          const subscription = await tx.subscriptions.update({
            where: { paypal_subscription_id: subscriptionId },
            data: {
              status: 'CANCELLED',
              cancelled_at: new Date(),
            },
          });

          // Remove premium status from user's studios
          await tx.studios.updateMany({
            where: { owner_id: subscription.user_id },
            data: { is_premium: false },
          });
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subscriptionId = resource.id;
        
        await db.subscriptions.update({
          where: { paypal_subscription_id: subscriptionId },
          data: { status: 'SUSPENDED' },
        });
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // Handle successful payment
        const subscriptionId = resource.billing_agreement_id;
        
        if (subscriptionId) {
          const subscription = await db.subscriptions.findUnique({
            where: { paypal_subscription_id: subscriptionId },
            include: { users: true },
          });

          if (subscription?.users?.email) {
            await sendEmail({
              to: subscription.users.email,
              subject: 'Payment Received - VoiceoverStudioFinder',
              html: paymentSuccessTemplate({
                customerName: subscription.users.display_name,
                amount: (parseFloat(resource.amount.total)).toFixed(2),
                currency: resource.amount.currency,
                invoiceNumber: resource.id,
                planName: 'Premium Studio Subscription',
                nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              }),
            });
          }
        }
        break;
      }

      case 'PAYMENT.SALE.DENIED': {
        // Handle failed payment
        const subscriptionId = resource.billing_agreement_id;
        
        if (subscriptionId) {
          const subscription = await db.subscriptions.findUnique({
            where: { paypal_subscription_id: subscriptionId },
            include: { users: true },
          });

          if (subscription?.users?.email) {
            await sendEmail({
              to: subscription.users.email,
              subject: 'Payment Failed - VoiceoverStudioFinder',
              html: paymentFailedTemplate({
                customerName: subscription.users.display_name,
                amount: (parseFloat(resource.amount.total)).toFixed(2),
                currency: resource.amount.currency,
                reason: resource.reason_code || 'Payment was declined by PayPal',
              }),
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled PayPal webhook event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}


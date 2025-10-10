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
        await db.subscription.update({
          where: { paypalSubscriptionId: subscriptionId },
          data: { 
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });

        // Send confirmation email
        const subscription = await db.subscription.findUnique({
          where: { paypalSubscriptionId: subscriptionId },
          include: { user: true },
        });

        if (subscription?.user?.email) {
          await sendEmail({
            to: subscription.user.email,
            subject: 'Subscription Activated - VoiceoverStudioFinder',
            html: paymentSuccessTemplate({
              customerName: subscription.user.display_name,
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
          const subscription = await tx.subscription.update({
            where: { paypalSubscriptionId: subscriptionId },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
            },
          });

          // Remove premium status from user's studios
          await tx.studio.updateMany({
            where: { owner_id: subscription.userId },
            data: { is_premium: false },
          });
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subscriptionId = resource.id;
        
        await db.subscription.update({
          where: { paypalSubscriptionId: subscriptionId },
          data: { status: 'SUSPENDED' },
        });
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // Handle successful payment
        const subscriptionId = resource.billing_agreement_id;
        
        if (subscriptionId) {
          const subscription = await db.subscription.findUnique({
            where: { paypalSubscriptionId: subscriptionId },
            include: { user: true },
          });

          if (subscription?.user?.email) {
            await sendEmail({
              to: subscription.user.email,
              subject: 'Payment Received - VoiceoverStudioFinder',
              html: paymentSuccessTemplate({
                customerName: subscription.user.display_name,
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
          const subscription = await db.subscription.findUnique({
            where: { paypalSubscriptionId: subscriptionId },
            include: { user: true },
          });

          if (subscription?.user?.email) {
            await sendEmail({
              to: subscription.user.email,
              subject: 'Payment Failed - VoiceoverStudioFinder',
              html: paymentFailedTemplate({
                customerName: subscription.user.display_name,
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

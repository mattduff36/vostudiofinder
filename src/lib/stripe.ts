import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-09-30.clover',
});

// Client-side Stripe instance
let stripePromise: ReturnType<typeof loadStripe>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  }
  return stripePromise;
};

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  PREMIUM_YEARLY: {
    id: 'premium_yearly',
    name: 'Premium Studio Listing',
    description: 'Enhanced studio listing with premium features',
    price: 2500, // £25.00 in pence
    currency: 'gbp',
    interval: 'year',
    features: [
      'Featured placement in search results',
      'Enhanced studio profile with unlimited images',
      'Priority customer support',
      'Advanced analytics and insights',
      'Custom studio branding options',
      'Direct booking integration',
    ],
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession({
  plan,
  user_id,
  studio_id,
  successUrl,
  cancelUrl,
}: {
  plan: SubscriptionPlan;
  user_id: string;
  studio_id: string;
  successUrl: string;
  cancelUrl: string;
}) {
  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  const planConfig = SUBSCRIPTION_PLANS[plan];

  // Create or retrieve Stripe customer
  const customer = await stripe.customers.list({
    limit: 1,
    email: user_id, // We'll use user ID as reference for now
  });

  let customerId: string;
  if (customer.data.length === 0) {
    const newCustomer = await stripe.customers.create({
      metadata: {
        user_id,
        studio_id,
      },
    });
    customerId = newCustomer.id;
  } else {
    customerId = customer.data[0]?.id || '';
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: planConfig.currency,
          product_data: {
            name: planConfig.name,
            description: planConfig.description,
          },
          unit_amount: planConfig.price,
          recurring: {
            interval: planConfig.interval,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id,
      studio_id,
      plan,
    },
    subscription_data: {
      metadata: {
        user_id,
        studio_id,
        plan,
      },
    },
  });

  return session;
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Handle successful subscription
 */
export async function handleSubscriptionSuccess(subscription: Stripe.Subscription) {
  const { user_id, studio_id, plan } = subscription.metadata;

  if (!user_id || !studio_id || !plan) {
    throw new Error('Missing subscription metadata');
  }

  // Update database with subscription info
  // This would be implemented with your database logic
  console.log('Subscription created:', {
    user_id,
    studio_id,
    plan,
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
  });

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
  };
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const { user_id, studio_id } = subscription.metadata;

  if (!user_id || !studio_id) {
    throw new Error('Missing subscription metadata');
  }

  // Update database to mark subscription as cancelled
  console.log('Subscription cancelled:', {
    user_id,
    studio_id,
    subscriptionId: subscription.id,
    cancelledAt: new Date(subscription.canceled_at! * 1000),
  });

  return {
    subscriptionId: subscription.id,
    status: 'cancelled',
  };
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
  secret: string
) {
  // Check if Stripe is properly configured
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured');
  }
  return stripe.webhooks.constructEvent(body, signature, secret);
}


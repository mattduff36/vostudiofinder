-- Remove PayPal integration columns
-- Created: January 11, 2025
-- Reason: PayPal payment integration removed in favor of Stripe-only

-- Remove PayPal columns from subscriptions table
ALTER TABLE "public"."subscriptions" DROP COLUMN IF EXISTS "paypal_subscription_id";

-- Remove PayPal columns from pending_subscriptions table  
ALTER TABLE "public"."pending_subscriptions" DROP COLUMN IF EXISTS "paypal_subscription_id";

-- Note: This migration assumes no active PayPal subscriptions exist in production
-- If any exist, they should be migrated/cancelled before running this migration


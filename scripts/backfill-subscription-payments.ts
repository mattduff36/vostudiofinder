/**
 * BACKFILL SUBSCRIPTION PAYMENT RECORDS
 *
 * Creates payment records for subscriptions that don't have one yet.
 * This ensures the admin payments page shows accurate total revenue.
 *
 * For each subscription without a matching payments row it:
 *   1. Retrieves the subscription from Stripe
 *   2. Gets the latest invoice + payment intent + charge
 *   3. Creates a payments row with metadata.subscription_id
 *
 * Modes:
 *   --dry-run     (default) Show what would be created, no writes
 *   --execute     Actually create the payment records
 *
 * Target database:
 *   --dev         Use .env.local (default)
 *   --production  Use .env.production
 *
 * Usage:
 *   npx tsx scripts/backfill-subscription-payments.ts
 *   npx tsx scripts/backfill-subscription-payments.ts --execute --production
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';

const TAG = '[BACKFILL-SUB-PAYMENTS]';

// ─── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode: 'dry-run' | 'execute' = args.includes('--execute') ? 'execute' : 'dry-run';
const useProduction = args.includes('--production');

// ─── Environment ─────────────────────────────────────────────────────────────

const envFile = useProduction ? '.env.production' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  console.error(`${TAG} ERROR: ${envFile} not found at ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath, override: true });

const DATABASE_URL = process.env.DATABASE_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!DATABASE_URL) {
  console.error(`${TAG} ERROR: DATABASE_URL not found in ${envFile}`);
  process.exit(1);
}
if (!STRIPE_SECRET_KEY) {
  console.error(`${TAG} ERROR: STRIPE_SECRET_KEY not found in ${envFile}`);
  process.exit(1);
}

const db = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover' as any,
});

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log(`${TAG} Subscription Payment Backfill (${mode.toUpperCase()})`);
  console.log(`${TAG} Target: ${useProduction ? 'PRODUCTION' : 'DEV'} database`);
  console.log('='.repeat(70) + '\n');

  const allSubscriptions = await db.subscriptions.findMany({
    select: {
      id: true,
      user_id: true,
      stripe_subscription_id: true,
      stripe_customer_id: true,
      current_period_start: true,
      current_period_end: true,
      status: true,
      created_at: true,
      users: { select: { email: true, display_name: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`${TAG} Found ${allSubscriptions.length} total subscriptions\n`);

  // Get all existing payments that have a subscription_id in metadata
  const existingPayments = await db.payments.findMany({
    where: { status: 'SUCCEEDED' },
    select: { id: true, metadata: true, user_id: true },
  });

  const coveredSubscriptionIds = new Set<string>();
  const coveredUserIds = new Set<string>();

  for (const p of existingPayments) {
    const meta = p.metadata as Record<string, any> | null;
    if (meta?.subscription_id) {
      coveredSubscriptionIds.add(meta.subscription_id);
      coveredUserIds.add(p.user_id);
    }
  }

  // Find subscriptions missing a payment record
  const missing = allSubscriptions.filter((sub) => {
    if (sub.stripe_subscription_id && coveredSubscriptionIds.has(sub.stripe_subscription_id)) {
      return false;
    }
    // Also check by user_id in case the payment was linked differently
    if (coveredUserIds.has(sub.user_id)) {
      return false;
    }
    return true;
  });

  console.log(`${TAG} ${existingPayments.length} existing payment records found`);
  console.log(`${TAG} ${allSubscriptions.length - missing.length} subscriptions already have payment records`);
  console.log(`${TAG} ${missing.length} subscriptions need backfill\n`);

  if (missing.length === 0) {
    console.log(`${TAG} Nothing to backfill. All subscriptions have payment records.`);
    return;
  }

  let created = 0;
  let skipped = 0;
  let errored = 0;

  for (const sub of missing) {
    const label = `${sub.users.email} (sub ${sub.id})`;

    // One-time payment subscriptions won't have a stripe_subscription_id
    if (!sub.stripe_subscription_id) {
      // Try to find this user's checkout session payment that already exists
      const userPayment = existingPayments.find((p) => p.user_id === sub.user_id);
      if (userPayment) {
        console.log(`  SKIP  ${label} — one-time payment record already exists`);
        skipped++;
        continue;
      }
      console.log(`  SKIP  ${label} — no stripe_subscription_id, cannot retrieve from Stripe`);
      skipped++;
      continue;
    }

    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      const latestInvoiceId = (stripeSub as any).latest_invoice as string | null;

      let paymentIntentId: string | null = null;
      let chargeId: string | null = null;
      let amountPaid = 0;
      let currency = 'gbp';

      if (latestInvoiceId) {
        const invoice = await stripe.invoices.retrieve(latestInvoiceId) as any;
        paymentIntentId = (invoice.payment_intent as string) || null;
        amountPaid = invoice.amount_paid || 0;
        currency = invoice.currency || 'gbp';

        if (paymentIntentId) {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          chargeId = (pi as any).latest_charge as string || null;
        }
      }

      if (amountPaid === 0) {
        console.log(`  SKIP  ${label} — Stripe returned amount_paid=0`);
        skipped++;
        continue;
      }

      console.log(`  ${mode === 'execute' ? 'CREATE' : 'WOULD CREATE'}  ${label} — ${(amountPaid / 100).toFixed(2)} ${currency.toUpperCase()}`);

      if (mode === 'execute') {
        await db.payments.create({
          data: {
            id: randomBytes(12).toString('base64url'),
            user_id: sub.user_id,
            stripe_payment_intent_id: paymentIntentId,
            stripe_charge_id: chargeId,
            amount: amountPaid,
            currency,
            status: 'SUCCEEDED',
            refunded_amount: 0,
            metadata: { subscription_id: sub.stripe_subscription_id },
            created_at: sub.created_at,
            updated_at: new Date(),
          },
        });
        created++;
      } else {
        created++;
      }
    } catch (err: any) {
      console.error(`  ERROR ${label} — ${err.message}`);
      errored++;
    }
  }

  console.log(`\n${TAG} Summary:`);
  console.log(`  ${mode === 'execute' ? 'Created' : 'Would create'}: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errored: ${errored}`);
}

main()
  .catch((err) => {
    console.error(`${TAG} Fatal error:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

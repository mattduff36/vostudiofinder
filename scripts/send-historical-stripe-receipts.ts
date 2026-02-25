/**
 * Send Stripe receipts for historical payments.
 *
 * Usage:
 *   npx tsx scripts/send-historical-stripe-receipts.ts          # dry-run (default)
 *   npx tsx scripts/send-historical-stripe-receipts.ts --send   # actually send receipts
 *
 * Loads .env.production for production database + Stripe keys.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';
import Stripe from 'stripe';

config({ path: path.resolve(process.cwd(), '.env.production') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.production');
  process.exit(1);
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY not found in .env.production');
  process.exit(1);
}

const db = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
});

const sendMode = process.argv.includes('--send');

async function main() {
  console.log('='.repeat(70));
  console.log(sendMode ? 'SEND MODE — receipts WILL be emailed' : 'DRY RUN — no emails will be sent');
  console.log('='.repeat(70));
  console.log(`Database: ${process.env.DATABASE_URL!.split('@')[1]?.split('/')[0] || 'unknown'}\n`);

  const payments = await db.payments.findMany({
    where: { status: 'SUCCEEDED' },
    orderBy: { created_at: 'asc' },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          display_name: true,
          username: true,
        },
      },
    },
  });

  console.log(`Found ${payments.length} successful payment(s).\n`);

  if (payments.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  const processed = new Set<string>();

  for (const payment of payments) {
    const idKey = payment.stripe_payment_intent_id || payment.stripe_charge_id || payment.id;

    if (processed.has(idKey)) {
      console.log(`  [SKIP] Already processed in this run: ${idKey}`);
      continue;
    }
    processed.add(idKey);

    console.log('-'.repeat(70));
    console.log(`Payment ID:      ${payment.id}`);
    console.log(`User:            ${payment.users?.display_name || 'N/A'} (@${payment.users?.username || 'N/A'})`);
    console.log(`Email:           ${payment.users?.email || 'N/A'}`);
    console.log(`Amount:          ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
    console.log(`Charge ID:       ${payment.stripe_charge_id || 'N/A'}`);
    console.log(`Payment Intent:  ${payment.stripe_payment_intent_id || 'N/A'}`);
    console.log(`Checkout Sess:   ${payment.stripe_checkout_session_id || 'N/A'}`);
    console.log(`Date:            ${payment.created_at?.toISOString() || 'N/A'}`);

    // Resolve charge
    let chargeId = payment.stripe_charge_id;

    if (!chargeId && payment.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {
          expand: ['latest_charge'],
        });
        const charge = pi.latest_charge;
        if (charge && typeof charge === 'object') {
          chargeId = charge.id;
        } else if (typeof charge === 'string') {
          chargeId = charge;
        }
      } catch (err) {
        console.log(`  [WARN] Could not retrieve payment intent: ${err}`);
      }
    }

    if (!chargeId) {
      console.log('  [SKIP] No charge ID found — cannot send receipt.');
      console.log();
      continue;
    }

    // Retrieve existing receipt URL
    let receiptUrl: string | null = null;
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      receiptUrl = charge.receipt_url || null;
      console.log(`Receipt URL:     ${receiptUrl || 'none'}`);
    } catch (err) {
      console.log(`  [WARN] Could not retrieve charge ${chargeId}: ${err}`);
    }

    const recipientEmail = payment.users?.email;

    if (!recipientEmail) {
      console.log('  [SKIP] No recipient email found.');
      console.log();
      continue;
    }

    if (sendMode) {
      // Update the charge's receipt_email to trigger Stripe to send a receipt
      try {
        await stripe.charges.update(chargeId, {
          receipt_email: recipientEmail,
        });
        console.log(`  [SENT] Receipt email triggered for ${recipientEmail} via charge ${chargeId}`);
      } catch (err) {
        console.error(`  [ERROR] Failed to send receipt: ${err}`);
      }
    } else {
      console.log(`  [DRY RUN] Would send receipt to: ${recipientEmail}`);
    }

    console.log();
  }

  console.log('='.repeat(70));
  console.log(sendMode ? 'Done. Receipts sent.' : 'Dry run complete. Run with --send to send receipts.');
  console.log('='.repeat(70));
}

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

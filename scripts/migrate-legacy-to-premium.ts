/**
 * LEGACY → PREMIUM MIGRATION SCRIPT
 * 
 * Converts legacy users (studio created before 2026-01-01) from BASIC to PREMIUM
 * and ensures they have an active subscription expiring 2026-08-31.
 * 
 * Modes:
 *   --dry-run     (default) Show what would change, but don't write anything
 *   --execute     Actually apply the changes
 *   --rollback    Revert changes made by a previous --execute run
 * 
 * Target database:
 *   --dev         Use .env.local (default)
 *   --production  Use .env.production
 * 
 * Usage:
 *   npx tsx scripts/migrate-legacy-to-premium.ts                      # dry-run on dev
 *   npx tsx scripts/migrate-legacy-to-premium.ts --execute             # execute on dev
 *   npx tsx scripts/migrate-legacy-to-premium.ts --execute --production # execute on production
 *   npx tsx scripts/migrate-legacy-to-premium.ts --rollback            # rollback on dev
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { randomBytes } from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEGACY_CUTOFF = new Date('2026-01-01T00:00:00.000Z');
// Note: LEGACY_CAP was removed — legacy users now get 6 months from first login with no cap.
// The batch migration (already executed) set expiry to 2026-08-31, but the login handler
// will recalculate to 6 months from actual first login when the user signs in.
const MIGRATION_TAG = 'legacy-to-premium-migration'; // stored in subscription metadata for rollback
const BATCH_SIZE = 50;

// ─── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode: 'dry-run' | 'execute' | 'rollback' =
  args.includes('--rollback') ? 'rollback' :
  args.includes('--execute') ? 'execute' : 'dry-run';
const useProduction = args.includes('--production');

// ─── Database connection ─────────────────────────────────────────────────────

const envFile = useProduction ? '.env.production' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  console.error(`❌ ERROR: ${envFile} not found at ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath, override: true });
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(`❌ ERROR: DATABASE_URL not found in ${envFile}`);
  process.exit(1);
}

const db = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, answer => { rl.close(); resolve(answer); }));
}

function dbLabel(): string {
  return useProduction ? 'PRODUCTION' : 'DEV';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log(`[LEGACY-MIGRATION] Legacy → Premium Migration (${mode.toUpperCase()})`);
  console.log(`[LEGACY-MIGRATION] Target: ${dbLabel()} database`);
  console.log('='.repeat(80) + '\n');

  if (mode === 'rollback') {
    await runRollback();
  } else {
    await runMigration();
  }
}

// ─── Migration (dry-run / execute) ───────────────────────────────────────────

async function runMigration() {
  // Find all legacy users who are still BASIC
  const legacyUsers = await db.users.findMany({
    where: {
      membership_tier: 'BASIC',
      status: 'ACTIVE',
      studio_profiles: {
        created_at: { lt: LEGACY_CUTOFF },
      },
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      membership_tier: true,
      status: true,
      studio_profiles: {
        select: {
          id: true,
          name: true,
          status: true,
          created_at: true,
        },
      },
      subscriptions: {
        orderBy: { created_at: 'desc' as const },
        take: 1,
        select: {
          id: true,
          status: true,
          current_period_end: true,
        },
      },
    },
  });

  console.log(`[LEGACY-MIGRATION] Found ${legacyUsers.length} legacy BASIC users with ACTIVE status\n`);

  if (legacyUsers.length === 0) {
    console.log('[LEGACY-MIGRATION] Nothing to migrate. All legacy users are already PREMIUM or inactive.\n');
    return;
  }

  // Categorize
  const needsSubscription: typeof legacyUsers = [];
  const hasActiveSubscription: typeof legacyUsers = [];
  const hasExpiredSubscription: typeof legacyUsers = [];

  for (const user of legacyUsers) {
    const sub = user.subscriptions[0];
    if (!sub || !sub.current_period_end) {
      needsSubscription.push(user);
    } else if (sub.current_period_end > new Date()) {
      hasActiveSubscription.push(user);
    } else {
      hasExpiredSubscription.push(user);
    }
  }

  console.log('[LEGACY-MIGRATION] Breakdown:');
  console.log(`  - No subscription (will create):     ${needsSubscription.length}`);
  console.log(`  - Active subscription (tier only):    ${hasActiveSubscription.length}`);
  console.log(`  - Expired subscription (tier + renew): ${hasExpiredSubscription.length}`);
  console.log('');

  if (mode === 'dry-run') {
    console.log('[LEGACY-MIGRATION] DRY RUN — no changes will be made.\n');
    
    // Show first 20 users as sample
    const sample = legacyUsers.slice(0, 20);
    console.log('Sample of users to migrate:');
    for (const u of sample) {
      const sub = u.subscriptions[0];
      const studioDate = u.studio_profiles?.created_at?.toISOString().split('T')[0] || 'N/A';
      const subInfo = sub?.current_period_end
        ? `sub expires ${sub.current_period_end.toISOString().split('T')[0]}`
        : 'no subscription';
      console.log(`  ${u.email} | studio: ${studioDate} | ${subInfo}`);
    }
    if (legacyUsers.length > 20) {
      console.log(`  ... and ${legacyUsers.length - 20} more\n`);
    }

    console.log('\n[LEGACY-MIGRATION] To apply these changes, run with --execute flag.');
    console.log(`  npx tsx scripts/migrate-legacy-to-premium.ts --execute${useProduction ? ' --production' : ''}\n`);
    return;
  }

  // ── Execute mode ──

  if (useProduction) {
    const answer = await askQuestion(
      `⚠️  You are about to modify ${legacyUsers.length} users in PRODUCTION.\n` +
      `Type "MIGRATE PRODUCTION" to confirm: `
    );
    if (answer !== 'MIGRATE PRODUCTION') {
      console.log('❌ Aborted by user');
      return;
    }
  }

  console.log(`[LEGACY-MIGRATION] Migrating ${legacyUsers.length} users in batches of ${BATCH_SIZE}...\n`);

  let tierUpdated = 0;
  let subscriptionsCreated = 0;
  let subscriptionsExtended = 0;
  let errors = 0;

  for (let i = 0; i < legacyUsers.length; i += BATCH_SIZE) {
    const batch = legacyUsers.slice(i, i + BATCH_SIZE);
    
    for (const user of batch) {
      try {
        await db.$transaction(async (tx) => {
          // 1. Set membership_tier to PREMIUM
          await tx.users.update({
            where: { id: user.id },
            data: { membership_tier: 'PREMIUM' },
          });
          tierUpdated++;

          // 2. Handle subscription
          const existingSub = user.subscriptions[0];
          const now = new Date();

          // Legacy users get 6 months of free Premium from now
          const sixMonthsFromNow = new Date(now);
          sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

          if (!existingSub || !existingSub.current_period_end) {
            // No subscription — create one
            await tx.subscriptions.create({
              data: {
                id: randomBytes(12).toString('base64url'),
                user_id: user.id,
                status: 'ACTIVE',
                payment_method: 'STRIPE',
                current_period_start: now,
                current_period_end: sixMonthsFromNow,
                created_at: now,
                updated_at: now,
              },
            });
            subscriptionsCreated++;
          } else if (existingSub.current_period_end < now) {
            // Expired subscription — extend to 6 months from now
            await tx.subscriptions.update({
              where: { id: existingSub.id },
              data: {
                status: 'ACTIVE',
                current_period_end: sixMonthsFromNow,
                updated_at: now,
              },
            });
            subscriptionsExtended++;
          }
          // If subscription is still active and future, leave it alone
        });

        if ((tierUpdated % 25 === 0) || tierUpdated === legacyUsers.length) {
          console.log(`  [LEGACY-MIGRATION] Progress: ${tierUpdated}/${legacyUsers.length} users migrated`);
        }
      } catch (err) {
        errors++;
        console.error(`  [LEGACY-MIGRATION] ERROR migrating ${user.email}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log('\n[LEGACY-MIGRATION] Migration complete!\n');
  console.log('Summary:');
  console.log(`  Tier updated to PREMIUM:    ${tierUpdated}`);
  console.log(`  Subscriptions created:      ${subscriptionsCreated}`);
  console.log(`  Subscriptions extended:     ${subscriptionsExtended}`);
  console.log(`  Errors:                     ${errors}`);
  console.log('');

  // Verify
  const remainingBasicLegacy = await db.users.count({
    where: {
      membership_tier: 'BASIC',
      status: 'ACTIVE',
      studio_profiles: {
        created_at: { lt: LEGACY_CUTOFF },
      },
    },
  });
  console.log(`[LEGACY-MIGRATION] Remaining BASIC legacy users: ${remainingBasicLegacy}`);
  if (remainingBasicLegacy === 0) {
    console.log('[LEGACY-MIGRATION] All legacy users have been converted to PREMIUM.\n');
  } else {
    console.log(`[LEGACY-MIGRATION] ${remainingBasicLegacy} users were not converted (check errors above).\n`);
  }
}

// ─── Rollback ────────────────────────────────────────────────────────────────

async function runRollback() {
  // Find users who are PREMIUM with legacy studios — these were potentially migrated
  const migratedUsers = await db.users.findMany({
    where: {
      membership_tier: 'PREMIUM',
      studio_profiles: {
        created_at: { lt: LEGACY_CUTOFF },
      },
    },
    select: {
      id: true,
      email: true,
      subscriptions: {
        orderBy: { created_at: 'desc' as const },
        take: 1,
        select: {
          id: true,
          current_period_end: true,
          stripe_subscription_id: true,
        },
      },
    },
  });

  // Filter to only those WITHOUT a Stripe subscription (paid users have stripe_subscription_id)
  const rollbackCandidates = migratedUsers.filter(u => {
    const sub = u.subscriptions[0];
    // Only rollback users who don't have a real Stripe subscription
    return !sub?.stripe_subscription_id;
  });

  console.log(`[LEGACY-MIGRATION] Found ${rollbackCandidates.length} PREMIUM legacy users without Stripe subscriptions`);
  console.log(`[LEGACY-MIGRATION] (Skipping ${migratedUsers.length - rollbackCandidates.length} users with real Stripe subscriptions)\n`);

  if (rollbackCandidates.length === 0) {
    console.log('[LEGACY-MIGRATION] Nothing to rollback.\n');
    return;
  }

  const answer = await askQuestion(
    `⚠️  This will revert ${rollbackCandidates.length} users from PREMIUM to BASIC on ${dbLabel()}.\n` +
    `Type "ROLLBACK" to confirm: `
  );
  if (answer !== 'ROLLBACK') {
    console.log('❌ Aborted by user');
    return;
  }

  let reverted = 0;
  let errors = 0;

  for (const user of rollbackCandidates) {
    try {
      await db.users.update({
        where: { id: user.id },
        data: { membership_tier: 'BASIC' },
      });
      reverted++;
    } catch (err) {
      errors++;
      console.error(`  [LEGACY-MIGRATION] ERROR rolling back ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[LEGACY-MIGRATION] Rollback complete: ${reverted} users reverted to BASIC, ${errors} errors.\n`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main()
  .catch(err => {
    console.error('[LEGACY-MIGRATION] Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

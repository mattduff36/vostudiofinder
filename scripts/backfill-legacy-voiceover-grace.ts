/**
 * LEGACY VOICEOVER GRACE PERIOD BACKFILL
 *
 * Identifies legacy users currently listing as VOICEOVER who have NOT
 * completed a qualifying paid 12+ month extension, and starts a 14-day
 * grace period for them.
 *
 * Modes:
 *   --dry-run     (default) Show what would change, but don't write anything
 *   --execute     Start grace periods for non-compliant users
 *
 * Target database:
 *   --dev         Use .env.local (default)
 *   --production  Use .env.production
 *
 * Usage:
 *   npx tsx scripts/backfill-legacy-voiceover-grace.ts
 *   npx tsx scripts/backfill-legacy-voiceover-grace.ts --execute
 *   npx tsx scripts/backfill-legacy-voiceover-grace.ts --execute --production
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { randomBytes } from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEGACY_CUTOFF = new Date('2026-01-01T00:00:00.000Z');
const GRACE_PERIOD_DAYS = 14;
const MIN_QUALIFYING_DAYS = 335;
const TAG = '[LEGACY-VO-GRACE]';

// ─── CLI flags ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode: 'dry-run' | 'execute' = args.includes('--execute') ? 'execute' : 'dry-run';
const useProduction = args.includes('--production');

// ─── Database connection ─────────────────────────────────────────────────────

const envFile = useProduction ? '.env.production' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  console.error(`${TAG} ERROR: ${envFile} not found at ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath, override: true });
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(`${TAG} ERROR: DATABASE_URL not found in ${envFile}`);
  process.exit(1);
}

const db = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

function dbLabel(): string {
  return useProduction ? 'PRODUCTION' : 'DEV';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log(`${TAG} Legacy Voiceover Grace Period Backfill (${mode.toUpperCase()})`);
  console.log(`${TAG} Target: ${dbLabel()} database`);
  console.log('='.repeat(80) + '\n');

  // Find all legacy users who have the VOICEOVER studio type
  const legacyVoiceoverUsers = await db.users.findMany({
    where: {
      status: 'ACTIVE',
      role: { not: 'ADMIN' },
      studio_profiles: {
        created_at: { lt: LEGACY_CUTOFF },
        studio_studio_types: { some: { studio_type: 'VOICEOVER' } },
      },
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      studio_profiles: {
        select: {
          id: true,
          name: true,
          created_at: true,
          studio_studio_types: {
            select: { studio_type: true },
          },
        },
      },
      subscriptions: {
        orderBy: { created_at: 'desc' as const },
        select: {
          stripe_subscription_id: true,
          stripe_customer_id: true,
          current_period_start: true,
          current_period_end: true,
          created_at: true,
        },
      },
      payments: {
        where: { status: 'SUCCEEDED' },
        take: 1,
        select: { id: true },
      },
      user_metadata: {
        where: {
          key: { in: ['legacy_voiceover_grace_ends_at', 'legacy_voiceover_unlocked_at'] },
        },
        select: { key: true, value: true },
      },
    },
  });

  console.log(`${TAG} Found ${legacyVoiceoverUsers.length} legacy users with VOICEOVER type\n`);

  if (legacyVoiceoverUsers.length === 0) {
    console.log(`${TAG} No legacy VOICEOVER users found. Nothing to do.\n`);
    return;
  }

  // Categorize each user
  const alreadyUnlocked: typeof legacyVoiceoverUsers = [];
  const alreadyInGrace: typeof legacyVoiceoverUsers = [];
  const needsGrace: typeof legacyVoiceoverUsers = [];
  const qualifiesByPayment: typeof legacyVoiceoverUsers = [];

  for (const user of legacyVoiceoverUsers) {
    const metaMap = new Map(user.user_metadata.map((m) => [m.key, m.value]));

    // Already unlocked via metadata
    if (metaMap.get('legacy_voiceover_unlocked_at')) {
      alreadyUnlocked.push(user);
      continue;
    }

    // Already has grace period started
    if (metaMap.get('legacy_voiceover_grace_ends_at')) {
      alreadyInGrace.push(user);
      continue;
    }

    // Check for qualifying paid 12+ month subscription
    const hasPaidPayment = user.payments.length > 0;
    let hasQualifyingSub = false;
    if (hasPaidPayment) {
      hasQualifyingSub = user.subscriptions.some((sub) => {
        const isPaid = sub.stripe_subscription_id != null || sub.stripe_customer_id != null;
        if (!isPaid) return false;
        const start = sub.current_period_start || sub.created_at;
        const end = sub.current_period_end;
        if (!end) return false;
        const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return durationDays >= MIN_QUALIFYING_DAYS;
      });
    }

    if (hasQualifyingSub) {
      qualifiesByPayment.push(user);
    } else {
      needsGrace.push(user);
    }
  }

  console.log(`${TAG} Breakdown:`);
  console.log(`  Already unlocked (metadata):       ${alreadyUnlocked.length}`);
  console.log(`  Already in grace period:            ${alreadyInGrace.length}`);
  console.log(`  Qualifies by paid 12+ month sub:    ${qualifiesByPayment.length}`);
  console.log(`  Needs grace period (non-compliant):  ${needsGrace.length}`);
  console.log('');

  // Detail on grace-period users
  if (alreadyInGrace.length > 0) {
    console.log(`${TAG} Users already in grace:`);
    for (const u of alreadyInGrace) {
      const graceEnds = u.user_metadata.find((m) => m.key === 'legacy_voiceover_grace_ends_at')?.value;
      console.log(`  ${u.email} — grace ends ${graceEnds || 'N/A'}`);
    }
    console.log('');
  }

  // Detail on users needing grace
  if (needsGrace.length > 0) {
    console.log(`${TAG} Users that need grace period started:`);
    for (const u of needsGrace) {
      const studioDate = u.studio_profiles?.created_at?.toISOString().split('T')[0] || 'N/A';
      const types = u.studio_profiles?.studio_studio_types?.map((t) => t.studio_type).join(', ') || '';
      console.log(`  ${u.email} | studio: ${studioDate} | types: ${types}`);
    }
    console.log('');
  }

  // Handle qualifying users who need their unlock metadata set
  if (qualifiesByPayment.length > 0) {
    console.log(`${TAG} Users qualifying by payment (will set unlock metadata):`);
    for (const u of qualifiesByPayment) {
      console.log(`  ${u.email}`);
    }
    console.log('');
  }

  if (mode === 'dry-run') {
    console.log(`${TAG} DRY RUN — no changes will be made.\n`);
    console.log(`${TAG} To apply changes, run with --execute flag.`);
    console.log(`  npx tsx scripts/backfill-legacy-voiceover-grace.ts --execute${useProduction ? ' --production' : ''}\n`);
    return;
  }

  // ── Execute mode ──

  if (useProduction) {
    const total = needsGrace.length + qualifiesByPayment.length;
    const answer = await askQuestion(
      `\n⚠️  You are about to modify ${total} users in PRODUCTION.\n` +
        `  - ${needsGrace.length} will have grace periods started\n` +
        `  - ${qualifiesByPayment.length} will have unlock metadata set\n` +
        `Type "START GRACE" to confirm: `
    );
    if (answer !== 'START GRACE') {
      console.log('Aborted by user');
      return;
    }
  }

  const now = new Date();
  const graceEndsAt = new Date(now);
  graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

  let graceStarted = 0;
  let unlockSet = 0;
  let errors = 0;

  // Start grace for non-compliant users
  for (const user of needsGrace) {
    try {
      await db.user_metadata.createMany({
        data: [
          {
            id: randomBytes(12).toString('base64url'),
            user_id: user.id,
            key: 'legacy_voiceover_grace_started_at',
            value: now.toISOString(),
            created_at: now,
            updated_at: now,
          },
          {
            id: randomBytes(12).toString('base64url'),
            user_id: user.id,
            key: 'legacy_voiceover_grace_ends_at',
            value: graceEndsAt.toISOString(),
            created_at: now,
            updated_at: now,
          },
        ],
      });
      graceStarted++;
    } catch (err) {
      errors++;
      console.error(`  ${TAG} ERROR starting grace for ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  // Set unlock metadata for qualifying users
  for (const user of qualifiesByPayment) {
    try {
      await db.user_metadata.upsert({
        where: { user_id_key: { user_id: user.id, key: 'legacy_voiceover_unlocked_at' } },
        update: { value: now.toISOString(), updated_at: now },
        create: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          key: 'legacy_voiceover_unlocked_at',
          value: now.toISOString(),
          created_at: now,
          updated_at: now,
        },
      });
      unlockSet++;
    } catch (err) {
      errors++;
      console.error(`  ${TAG} ERROR setting unlock for ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n${TAG} Backfill complete!\n`);
  console.log('Summary:');
  console.log(`  Grace periods started:   ${graceStarted}`);
  console.log(`  Unlock metadata set:     ${unlockSet}`);
  console.log(`  Errors:                  ${errors}`);
  console.log(`  Grace expires at:        ${graceEndsAt.toISOString()}`);
  console.log('');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

main()
  .catch((err) => {
    console.error(`${TAG} Fatal error:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

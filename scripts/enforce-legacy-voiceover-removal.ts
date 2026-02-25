/**
 * LEGACY VOICEOVER POST-GRACE ENFORCEMENT
 *
 * Finds legacy users whose 14-day grace period has expired and who have NOT
 * unlocked VOICEOVER via a qualifying 12+ month paid extension. Removes the
 * VOICEOVER studio type, falling back to HOME if it was their only type.
 *
 * Idempotent — safe to run repeatedly (skips users already processed).
 *
 * Modes:
 *   --dry-run     (default) Show what would change, but don't write anything
 *   --execute     Actually remove VOICEOVER types
 *
 * Target database:
 *   --dev         Use .env.local (default)
 *   --production  Use .env.production
 *
 * Usage:
 *   npx tsx scripts/enforce-legacy-voiceover-removal.ts
 *   npx tsx scripts/enforce-legacy-voiceover-removal.ts --execute
 *   npx tsx scripts/enforce-legacy-voiceover-removal.ts --execute --production
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { randomBytes } from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────────────

const LEGACY_CUTOFF = new Date('2026-01-01T00:00:00.000Z');
const TAG = '[LEGACY-VO-ENFORCE]';

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
  console.log(`${TAG} Post-Grace VOICEOVER Enforcement (${mode.toUpperCase()})`);
  console.log(`${TAG} Target: ${dbLabel()} database`);
  console.log('='.repeat(80) + '\n');

  const now = new Date();

  // Find legacy users who:
  //  - have VOICEOVER type
  //  - have a grace_ends_at in the past
  //  - do NOT have an unlock
  const candidates = await db.users.findMany({
    where: {
      status: 'ACTIVE',
      role: { not: 'ADMIN' },
      studio_profiles: {
        created_at: { lt: LEGACY_CUTOFF },
        studio_studio_types: { some: { studio_type: 'VOICEOVER' } },
      },
      user_metadata: {
        some: {
          key: 'legacy_voiceover_grace_ends_at',
          value: { lt: now.toISOString() },
        },
      },
      NOT: {
        user_metadata: {
          some: { key: 'legacy_voiceover_unlocked_at' },
        },
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
          studio_studio_types: {
            select: { studio_type: true },
          },
        },
      },
      user_metadata: {
        where: { key: 'legacy_voiceover_grace_ends_at' },
        select: { value: true },
      },
    },
  });

  console.log(`${TAG} Found ${candidates.length} users with expired grace and no unlock\n`);

  if (candidates.length === 0) {
    console.log(`${TAG} No users need enforcement. All clear.\n`);
    return;
  }

  for (const u of candidates) {
    const graceEnded = u.user_metadata[0]?.value || 'N/A';
    const types = u.studio_profiles?.studio_studio_types?.map((t) => t.studio_type).join(', ') || '';
    console.log(`  ${u.email} | grace ended: ${graceEnded} | types: ${types}`);
  }
  console.log('');

  if (mode === 'dry-run') {
    console.log(`${TAG} DRY RUN — no changes will be made.\n`);
    console.log(`${TAG} To apply changes, run with --execute flag.`);
    console.log(`  npx tsx scripts/enforce-legacy-voiceover-removal.ts --execute${useProduction ? ' --production' : ''}\n`);
    return;
  }

  // ── Execute mode ──

  if (useProduction) {
    const answer = await askQuestion(
      `\n⚠️  You are about to remove VOICEOVER from ${candidates.length} users in PRODUCTION.\n` +
        `Type "REMOVE VOICEOVER" to confirm: `
    );
    if (answer !== 'REMOVE VOICEOVER') {
      console.log('Aborted by user');
      return;
    }
  }

  let removed = 0;
  let homeFallback = 0;
  let errors = 0;

  for (const user of candidates) {
    const studioId = user.studio_profiles?.id;
    if (!studioId) {
      console.log(`  ${TAG} SKIP ${user.email} — no studio profile`);
      continue;
    }

    try {
      const studioTypes = user.studio_profiles!.studio_studio_types;
      const hasVoiceover = studioTypes.some((t) => t.studio_type === 'VOICEOVER');
      if (!hasVoiceover) {
        console.log(`  ${TAG} SKIP ${user.email} — VOICEOVER already removed`);
        continue;
      }

      await db.$transaction(async (tx) => {
        await tx.studio_studio_types.deleteMany({
          where: { studio_id: studioId, studio_type: 'VOICEOVER' },
        });

        const remaining = studioTypes.filter((t) => t.studio_type !== 'VOICEOVER');
        if (remaining.length === 0) {
          await tx.studio_studio_types.create({
            data: {
              id: randomBytes(12).toString('base64url'),
              studio_id: studioId,
              studio_type: 'HOME',
            },
          });
          homeFallback++;
        }
      });

      removed++;
      console.log(`  ${TAG} REMOVED VOICEOVER from ${user.email}${homeFallback > removed - 1 ? ' (added HOME fallback)' : ''}`);
    } catch (err) {
      errors++;
      console.error(`  ${TAG} ERROR for ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n${TAG} Enforcement complete!\n`);
  console.log('Summary:');
  console.log(`  VOICEOVER removed:    ${removed}`);
  console.log(`  HOME fallbacks added: ${homeFallback}`);
  console.log(`  Errors:               ${errors}`);
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

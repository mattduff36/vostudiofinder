/**
 * Delete Uppercase Duplicate Legacy Accounts
 *
 * The Sep 18 2025 legacy migration created duplicate accounts for 17 users:
 * one with mixed-case email and one with lowercase. This script deletes the
 * uppercase (legacy) duplicate, keeping the lowercase version.
 *
 * Flags:
 *   --production   Target the production database (loads .env.production).
 *   --apply        Actually delete. Without this flag, runs in dry-run mode.
 *
 * Usage:
 *   npx tsx scripts/delete-uppercase-duplicate-accounts.ts                        # dry-run dev
 *   npx tsx scripts/delete-uppercase-duplicate-accounts.ts --apply                # apply dev
 *   npx tsx scripts/delete-uppercase-duplicate-accounts.ts --production           # dry-run prod
 *   npx tsx scripts/delete-uppercase-duplicate-accounts.ts --production --apply   # apply prod
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const isProduction = process.argv.includes('--production');
const applyMode = process.argv.includes('--apply');

if (isProduction) {
  const prodEnvPath = path.resolve(process.cwd(), '.env.production');
  if (!fs.existsSync(prodEnvPath)) {
    console.error('❌ .env.production not found. Cannot target production.');
    process.exit(1);
  }
  dotenv.config({ path: prodEnvPath, override: true });
}

const db = new PrismaClient({ log: ['warn', 'error'] });

const UPPERCASE_EMAILS = [
  'RTMachin@Magepro.com',
  'Studio@voiceover.com.au',
  'Mike.moran@thevocalbooth.com',
  'Doc@radiojingles.com',
  'helen@HQvoice.com',
  'Mark@BlackBoxVoiceProductions.com',
  'Hello@lotasproductions.com',
  'Krueger0815@gmail.com',
  'Rachiehan@gmail.com',
  'Magnetic@mac.com',
  'Katy@maw-media.co.uk',
  'Info@louisagummer.com',
  'kendra@brilliantVO.com',
  'Gavin.hyatt@grstudios.co.uk',
  'MatthewCurtis@MictheMatt.com',
  'Trish@VoiceoversByTrish.com',
  'mail@RadioStudioHire.com',
];

async function main() {
  try {
    const target = isProduction ? '🔴 PRODUCTION' : '🟢 DEV';
    const mode = applyMode ? 'APPLY' : 'DRY-RUN';

    console.log('='.repeat(80));
    console.log(`DELETE UPPERCASE DUPLICATE ACCOUNTS — ${target} — ${mode}`);
    console.log('='.repeat(80));

    let found = 0;
    let deleted = 0;
    let notFound = 0;
    let noLowercasePair = 0;

    for (const upperEmail of UPPERCASE_EMAILS) {
      const lowerEmail = upperEmail.toLowerCase();

      const [upperUser, lowerUser] = await Promise.all([
        db.users.findUnique({
          where: { email: upperEmail },
          select: { id: true, email: true, username: true, last_login: true, studio_profiles: { select: { id: true, name: true } } },
        }),
        db.users.findUnique({
          where: { email: lowerEmail },
          select: { id: true, email: true, username: true, last_login: true },
        }),
      ]);

      if (!upperUser) {
        console.log(`  ⏭️  ${upperEmail} — not found (already cleaned or doesn't exist here)`);
        notFound++;
        continue;
      }

      if (!lowerUser) {
        console.log(`  ⚠️  ${upperEmail} — no lowercase pair found! Skipping to be safe.`);
        noLowercasePair++;
        continue;
      }

      found++;
      console.log(`  🔍 ${upperEmail} → keeping ${lowerEmail} (id: ${lowerUser.id}), deleting uppercase (id: ${upperUser.id})`);

      if (applyMode) {
        // Delete all related data for the uppercase user, then the user itself.
        // Order matters for FK constraints.
        const userId = upperUser.id;
        const studioId = upperUser.studio_profiles?.id;

        // Delete studio-related child records first
        if (studioId) {
          await db.studio_images.deleteMany({ where: { studio_id: studioId } });
          await db.studio_services.deleteMany({ where: { studio_id: studioId } });
          await db.studio_studio_types.deleteMany({ where: { studio_id: studioId } });
          await db.reviews.deleteMany({ where: { studio_id: studioId } });
          await db.pending_subscriptions.deleteMany({ where: { studio_id: studioId } });
          await db.profile_audit_log.deleteMany({ where: { studio_profile_id: studioId } });
          const auditFindings = await db.profile_audit_findings.findMany({ where: { studio_profile_id: studioId }, select: { id: true } });
          if (auditFindings.length > 0) {
            await db.profile_enrichment_suggestions.deleteMany({ where: { audit_finding_id: { in: auditFindings.map(f => f.id) } } });
            await db.profile_audit_findings.deleteMany({ where: { studio_profile_id: studioId } });
          }
          await db.studio_profiles.delete({ where: { id: studioId } });
        }

        // Delete user-related records
        await db.email_deliveries.deleteMany({ where: { user_id: userId } });
        await db.email_preferences.deleteMany({ where: { user_id: userId } });
        await db.subscriptions.deleteMany({ where: { user_id: userId } });
        await db.payments.deleteMany({ where: { user_id: userId } });
        await db.notifications.deleteMany({ where: { user_id: userId } });
        await db.user_metadata.deleteMany({ where: { user_id: userId } });
        await db.user_connections.deleteMany({ where: { OR: [{ user_id: userId }, { connected_user_id: userId }] } });
        await db.sessions.deleteMany({ where: { user_id: userId } });
        await db.accounts.deleteMany({ where: { user_id: userId } });
        await db.saved_searches.deleteMany({ where: { user_id: userId } });
        await db.content_reports.deleteMany({ where: { OR: [{ reporter_id: userId }, { reported_user_id: userId }] } });
        await db.support_tickets.deleteMany({ where: { user_id: userId } });
        await db.admin_sticky_notes.deleteMany({ where: { key: userId } });
        await db.messages.deleteMany({ where: { OR: [{ sender_id: userId }, { receiver_id: userId }] } });

        // Finally delete the user
        await db.users.delete({ where: { id: userId } });
        deleted++;
        console.log(`     ✅ Deleted user ${userId} and all related data`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`📊 Summary: ${found} duplicate pairs found, ${deleted} deleted, ${notFound} not found, ${noLowercasePair} skipped (no lowercase pair)`);
    if (!applyMode && found > 0) {
      console.log('💡 Run with --apply to actually delete these accounts.');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

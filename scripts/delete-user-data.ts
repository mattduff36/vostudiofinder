import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

interface CliArgs {
  envFile: string;
  dryRun: boolean;
  confirm: boolean;
  userId?: string;
  email?: string;
  username?: string;
  includeUsernameMatch: boolean;
  deleteWaitlistByEmail: boolean;
}

interface DbUserMatch {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  status: string;
  created_at: Date;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    envFile: '.env.local',
    dryRun: true,
    confirm: false,
    includeUsernameMatch: false,
    deleteWaitlistByEmail: true,
  };

  for (const rawArg of argv) {
    if (!rawArg.startsWith('--')) continue;

    const [rawKey, ...rest] = rawArg.slice(2).split('=');
    const key = rawKey.trim();
    const value = rest.join('=').trim();

    if (key === 'env-file' && value) args.envFile = value;
    if (key === 'user-id' && value) args.userId = value;
    if (key === 'email' && value) args.email = value;
    if (key === 'username' && value) args.username = value;

    if (key === 'include-username-match') args.includeUsernameMatch = true;
    if (key === 'no-waitlist-delete') args.deleteWaitlistByEmail = false;

    if (key === 'dry-run') args.dryRun = true;
    if (key === 'confirm') {
      args.confirm = true;
      args.dryRun = false;
    }
  }

  return args;
}

function maskDbUrl(url: string | undefined): string {
  if (!url) return '(not set)';
  return url.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3');
}

function printUsage(): void {
  console.log(`
Usage:
  npm run user:delete -- --email=you@example.com [--username=Name] [--include-username-match] [--env-file=.env.local]
  npm run user:delete -- --user-id=USER_ID [--env-file=.env.local]

Defaults:
  - Runs in DRY RUN mode unless you pass --confirm
  - Deletes waitlist rows by email (disable with --no-waitlist-delete)

Examples:
  # Preview what would be deleted (safe):
  npm run user:delete -- --email=matt.mpdee@gmail.com

  # Actually delete (DANGEROUS):
  npm run user:delete -- --email=matt.mpdee@gmail.com --confirm

  # Production (only if .env.production exists and points at prod):
  npm run user:delete -- --email=matt.mpdee@gmail.com --env-file=.env.production --confirm
`.trim());
  console.log();
}

async function deleteUserData() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.userId && !args.email) {
    console.error('❌ Missing required identifier: provide --user-id or --email');
    printUsage();
    process.exit(1);
  }

  if (!args.dryRun && !args.confirm) {
    console.error('❌ Refusing to run without --dry-run or --confirm');
    printUsage();
    process.exit(1);
  }

  dotenv.config({ path: args.envFile });

  const prisma = new PrismaClient();
  console.log(`\n🧹 Delete user data script\n`);
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (no changes)' : 'CONFIRMED DELETE'}`);
  console.log(`Env file: ${args.envFile}`);
  console.log(`Database: ${maskDbUrl(process.env.DATABASE_URL)}\n`);

  try {
    const whereClauses: string[] = [];
    const values: Array<string> = [];

    if (args.userId) {
      whereClauses.push(`id = $${values.length + 1}`);
      values.push(args.userId);
    }

    if (args.email) {
      whereClauses.push(`LOWER(email) = LOWER($${values.length + 1})`);
      values.push(args.email);
    }

    if (args.includeUsernameMatch && args.username) {
      whereClauses.push(`LOWER(username) = LOWER($${values.length + 1})`);
      values.push(args.username);
    }

    const users = await prisma.$queryRawUnsafe<DbUserMatch[]>(
      `
      SELECT id, email, username, display_name, status, created_at
      FROM users
      WHERE ${whereClauses.map((c) => `(${c})`).join(' OR ')}
      ORDER BY created_at DESC
      `,
      ...values
    );

    if (users.length === 0) {
      console.log('✅ No matching user(s) found.\n');

      if (args.email && args.deleteWaitlistByEmail) {
        const waitlistCount = await prisma.waitlist.count({
          where: { email: { equals: args.email, mode: 'insensitive' } },
        });
        console.log(`Waitlist entries matching email: ${waitlistCount}`);
        if (!args.dryRun && waitlistCount > 0) {
          await prisma.waitlist.deleteMany({
            where: { email: { equals: args.email, mode: 'insensitive' } },
          });
          console.log('✅ Deleted waitlist entries.\n');
        }
      }

      return;
    }

    console.log(`⚠️  Matched ${users.length} user(s):\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email} @${u.username}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Display Name: ${u.display_name || '(none)'}`);
      console.log(`   Status: ${u.status}`);
      console.log(`   Created: ${u.created_at.toISOString()}`);
    });
    console.log();

    if (args.email && args.deleteWaitlistByEmail) {
      const waitlistCount = await prisma.waitlist.count({
        where: { email: { equals: args.email, mode: 'insensitive' } },
      });
      console.log(`Waitlist entries matching email: ${waitlistCount}\n`);
    }

    if (args.dryRun) {
      console.log('✅ Dry run complete. Re-run with --confirm to delete.\n');
      return;
    }

    console.log('🗑️  Deleting user(s) and related data...\n');

    for (const user of users) {
      console.log(`Deleting: ${user.email} (${user.id})`);

      await prisma.$transaction(async (tx) => {
        const userId = user.id;

        // Waitlist entries (by email)
        if (args.email && args.deleteWaitlistByEmail) {
          await tx.waitlist.deleteMany({
            where: { email: { equals: args.email, mode: 'insensitive' } },
          });
        }

        // Studio profiles (allow multiple defensively)
        const studioProfiles = await tx.studio_profiles.findMany({
          where: { user_id: userId },
          select: { id: true },
        });
        const studioIds = studioProfiles.map((s) => s.id);

        // Reviews (as reviewer, or for owned studio(s))
        await tx.reviews.deleteMany({
          where: {
            OR: [
              { reviewer_id: userId },
              ...(studioIds.length > 0 ? studioIds.map((id) => ({ studio_id: id })) : []),
            ],
          },
        });

        // Studio-related data
        if (studioIds.length > 0) {
          await tx.studio_services.deleteMany({ where: { studio_id: { in: studioIds } } });
          await tx.studio_studio_types.deleteMany({ where: { studio_id: { in: studioIds } } });
          await tx.studio_images.deleteMany({ where: { studio_id: { in: studioIds } } });
          await tx.studio_profiles.deleteMany({ where: { id: { in: studioIds } } });
        }

        // Messaging + social features
        await tx.messages.deleteMany({
          where: { OR: [{ sender_id: userId }, { receiver_id: userId }] },
        });
        await tx.user_connections.deleteMany({
          where: { OR: [{ user_id: userId }, { connected_user_id: userId }] },
        });
        await tx.notifications.deleteMany({ where: { user_id: userId } });
        await tx.saved_searches.deleteMany({ where: { user_id: userId } });
        await tx.support_tickets.deleteMany({ where: { user_id: userId } });

        // Moderation/content
        await tx.content_reports.deleteMany({
          where: {
            OR: [
              { reporter_id: userId },
              { reported_user_id: userId },
              { reviewed_by_id: userId },
            ],
          },
        });
        await tx.review_responses.deleteMany({ where: { author_id: userId } });

        // Billing
        const paymentIds = (
          await tx.payments.findMany({
            where: { user_id: userId },
            select: { id: true },
          })
        ).map((p) => p.id);
        await tx.refunds.deleteMany({
          where: {
            OR: [
              { user_id: userId },
              ...(paymentIds.length > 0 ? [{ payment_id: { in: paymentIds } }] : []),
            ],
          },
        });
        await tx.payments.deleteMany({ where: { user_id: userId } });
        await tx.subscriptions.deleteMany({ where: { user_id: userId } });
        await tx.pending_subscriptions.deleteMany({ where: { user_id: userId } });

        // Auth + metadata
        await tx.sessions.deleteMany({ where: { user_id: userId } });
        await tx.accounts.deleteMany({ where: { user_id: userId } });
        await tx.user_metadata.deleteMany({ where: { user_id: userId } });

        // Finally, user
        await tx.users.delete({ where: { id: userId } });
      });

      console.log(`✅ Deleted: ${user.email}\n`);
    }

    console.log('✅ Deletion run complete.\n');
  } finally {
    await prisma.$disconnect();
  }
}

deleteUserData().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


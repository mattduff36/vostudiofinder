import { config } from 'dotenv';
import * as path from 'path';
config({ path: path.resolve(process.cwd(), '.env.production'), override: true });

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
const db = new PrismaClient();

const dryRun = !process.argv.includes('--execute');

async function main() {
  if (dryRun) {
    console.log('=== DRY RUN (pass --execute to apply) ===\n');
  }

  const usersWithoutProfiles = await db.users.findMany({
    where: {
      status: 'ACTIVE',
      studio_profiles: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      membership_tier: true,
      created_at: true,
    },
  });

  console.log(`Found ${usersWithoutProfiles.length} ACTIVE user(s) without a studio profile:\n`);

  for (const user of usersWithoutProfiles) {
    console.log(`  - ${user.display_name || user.username || user.email} (${user.membership_tier}) [${user.id}]`);
  }

  if (usersWithoutProfiles.length === 0) {
    console.log('\nNothing to do.');
    await db.$disconnect();
    return;
  }

  if (dryRun) {
    console.log(`\nDry run complete. Run with --execute to create ${usersWithoutProfiles.length} profile(s).`);
    await db.$disconnect();
    return;
  }

  console.log(`\nCreating ${usersWithoutProfiles.length} studio profile(s)...`);
  const now = new Date();

  for (const user of usersWithoutProfiles) {
    try {
      await db.studio_profiles.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          user_id: user.id,
          name: '',
          city: '',
          is_profile_visible: false,
          show_email: true,
          created_at: now,
          updated_at: now,
        },
      });
      console.log(`  ✓ Created profile for ${user.display_name || user.email}`);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        console.log(`  ~ Profile already exists for ${user.display_name || user.email} (race condition)`);
      } else {
        console.error(`  ✗ Failed for ${user.display_name || user.email}:`, error.message);
      }
    }
  }

  console.log('\nDone.');
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * Script to migrate all STUDIO_OWNER users to USER role in PRODUCTION
 * This script uses the PRODUCTION_DATABASE_URL environment variable
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

// Load .env.production file
config({ path: resolve(process.cwd(), '.env.production') });

// Use production database URL
const prodUrl = process.env.DATABASE_URL;

if (!prodUrl) {
  console.error('❌ PRODUCTION_DATABASE_URL not found in environment variables!');
  process.exit(1);
}

const db = new PrismaClient({
  datasources: {
    db: {
      url: prodUrl,
    },
  },
});

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function migrateProductionStudioOwners() {
  try {
    console.log('🚨 WARNING: You are about to modify the PRODUCTION database! 🚨\n');
    console.log(`Database: ${prodUrl.split('@')[1]?.split('?')[0] || 'Unknown'}\n`);

    // First, let's see how many STUDIO_OWNER users exist
    console.log('🔍 Checking for users with STUDIO_OWNER role...\n');

    const studioOwners = await db.users.findMany({
      where: {
        role: 'STUDIO_OWNER' as any,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
      },
    });

    if (studioOwners.length === 0) {
      console.log('✅ No STUDIO_OWNER users found in production. Migration not needed.\n');
      rl.close();
      return;
    }

    console.log(`📊 Found ${studioOwners.length} users with STUDIO_OWNER role in PRODUCTION:\n`);
    studioOwners.forEach((user, index) => {
      console.log(`${index + 1}. ${user.display_name} (${user.email})`);
    });

    console.log('\n⚠️  These users will be changed from STUDIO_OWNER to USER role.\n');

    // Ask for confirmation
    const answer = await askQuestion('Do you want to proceed? (type "yes" to confirm): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Migration cancelled by user.\n');
      rl.close();
      return;
    }

    console.log('\n🔄 Updating all STUDIO_OWNER users to USER role in PRODUCTION...\n');

    // Update all STUDIO_OWNER users to USER
    const result = await db.users.updateMany({
      where: {
        role: 'STUDIO_OWNER' as any,
      },
      data: {
        role: 'USER',
      },
    });

    console.log(`✅ Successfully updated ${result.count} users from STUDIO_OWNER to USER in PRODUCTION\n`);

    // Verify the update
    const remainingStudioOwners = await db.users.count({
      where: {
        role: 'STUDIO_OWNER' as any,
      },
    });

    if (remainingStudioOwners === 0) {
      console.log('✅ Verification: No STUDIO_OWNER users remain in the production database.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingStudioOwners} STUDIO_OWNER users still exist!\n`);
    }

    // Show role distribution after migration
    console.log('📊 Current role distribution in PRODUCTION:');
    const roles = await db.users.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    roles.forEach((role) => {
      console.log(`   ${role.role}: ${role._count.role} users`);
    });

    console.log('\n✨ Production migration complete!\n');
  } catch (error) {
    console.error('❌ Error during production migration:', error);
    throw error;
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

// Run the migration
migrateProductionStudioOwners()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


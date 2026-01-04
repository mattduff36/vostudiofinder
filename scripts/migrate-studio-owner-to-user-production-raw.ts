/**
 * Script to migrate all STUDIO_OWNER users to USER role in PRODUCTION
 * Uses raw SQL queries since STUDIO_OWNER has been removed from Prisma schema
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
  console.error('❌ DATABASE_URL not found in .env.production!');
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

    // First, let's see how many STUDIO_OWNER users exist (using raw SQL)
    console.log('🔍 Checking for users with STUDIO_OWNER role...\n');

    const studioOwnersRaw: any[] = await db.$queryRaw`
      SELECT id, email, display_name, role::text as role 
      FROM users 
      WHERE role::text = 'STUDIO_OWNER'
    `;

    if (studioOwnersRaw.length === 0) {
      console.log('✅ No STUDIO_OWNER users found in production. Migration not needed.\n');
      rl.close();
      return;
    }

    console.log(`📊 Found ${studioOwnersRaw.length} users with STUDIO_OWNER role in PRODUCTION:\n`);
    studioOwnersRaw.forEach((user, index) => {
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

    // Update all STUDIO_OWNER users to USER (using raw SQL)
    const result: any = await db.$executeRaw`
      UPDATE users 
      SET role = 'USER'::Role
      WHERE role::text = 'STUDIO_OWNER'
    `;

    console.log(`✅ Successfully updated ${result} users from STUDIO_OWNER to USER in PRODUCTION\n`);

    // Verify the update (using raw SQL)
    const remainingStudioOwnersRaw: any[] = await db.$queryRaw`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role::text = 'STUDIO_OWNER'
    `;
    const remainingCount = Number(remainingStudioOwnersRaw[0]?.count || 0);

    if (remainingCount === 0) {
      console.log('✅ Verification: No STUDIO_OWNER users remain in the production database.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} STUDIO_OWNER users still exist!\n`);
    }

    // Show role distribution after migration (using raw SQL)
    console.log('📊 Current role distribution in PRODUCTION:');
    const rolesRaw: any[] = await db.$queryRaw`
      SELECT role::text as role, COUNT(*) as count 
      FROM users 
      GROUP BY role::text
      ORDER BY role::text
    `;

    rolesRaw.forEach((role) => {
      console.log(`   ${role.role}: ${role.count} users`);
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


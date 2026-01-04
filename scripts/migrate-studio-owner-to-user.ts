/**
 * Script to migrate all STUDIO_OWNER users to USER role
 * Run this BEFORE applying the Prisma migration that removes STUDIO_OWNER from the enum
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function migrateStudioOwners() {
  try {
    console.log('🔍 Checking for users with STUDIO_OWNER role...\n');

    // First, let's see how many STUDIO_OWNER users exist
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
      console.log('✅ No STUDIO_OWNER users found. Migration not needed.\n');
      return;
    }

    console.log(`📊 Found ${studioOwners.length} users with STUDIO_OWNER role:\n`);
    studioOwners.forEach((user, index) => {
      console.log(`${index + 1}. ${user.display_name} (${user.email})`);
    });

    console.log('\n🔄 Updating all STUDIO_OWNER users to USER role...\n');

    // Update all STUDIO_OWNER users to USER
    const result = await db.users.updateMany({
      where: {
        role: 'STUDIO_OWNER' as any,
      },
      data: {
        role: 'USER',
      },
    });

    console.log(`✅ Successfully updated ${result.count} users from STUDIO_OWNER to USER\n`);

    // Verify the update
    const remainingStudioOwners = await db.users.count({
      where: {
        role: 'STUDIO_OWNER' as any,
      },
    });

    if (remainingStudioOwners === 0) {
      console.log('✅ Verification: No STUDIO_OWNER users remain in the database.\n');
    } else {
      console.log(`⚠️  Warning: ${remainingStudioOwners} STUDIO_OWNER users still exist!\n`);
    }

    // Show role distribution after migration
    console.log('📊 Current role distribution:');
    const roles = await db.users.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });

    roles.forEach((role) => {
      console.log(`   ${role.role}: ${role._count.role} users`);
    });

    console.log('\n✨ Migration complete! You can now apply the Prisma schema migration.\n');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the migration
migrateStudioOwners()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


#!/usr/bin/env tsx

/**
 * Migration script to convert single studioType field to multiple studio types
 * This script should be run after the database schema has been updated
 */

import { PrismaClient, StudioType } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStudioTypes() {
  console.log('Starting studio types migration...');

  try {
    // Get all studios with their current studioType
    const studios = await prisma.studio.findMany({
      select: {
        id: true,
        studioType: true,
      },
    });

    console.log(`Found ${studios.length} studios to migrate`);

    // Migrate each studio
    for (const studio of studios) {
      console.log(`Migrating studio ${studio.id} with type ${studio.studioType}`);

      // Create the studio type relationship
      await prisma.studioStudioType.create({
        data: {
          studioId: studio.id,
          studioType: studio.studioType as StudioType,
        },
      });

      console.log(`✅ Migrated studio ${studio.id}`);
    }

    console.log('✅ Studio types migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateStudioTypes()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });


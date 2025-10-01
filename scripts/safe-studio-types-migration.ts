#!/usr/bin/env tsx

/**
 * Safe migration script for studio types on production database
 * This script will:
 * 1. Create the new studio_studio_types table
 * 2. Migrate existing studio_type data to the new table
 * 3. Then we can safely remove the old column
 */

import { PrismaClient, StudioType } from '@prisma/client';

const prisma = new PrismaClient();

async function safeMigration() {
  console.log('🚀 Starting safe studio types migration...');

  try {
    // Step 1: Check current data
    console.log('\n1. Checking current studio data...');
    const studios = await prisma.studio.findMany({
      select: {
        id: true,
        studioType: true,
        name: true
      }
    });

    console.log(`Found ${studios.length} studios to migrate`);
    
    // Show distribution of current studio types
    const typeCounts = studios.reduce((acc, studio) => {
      const type = studio.studioType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Current studio type distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} studios`);
    });

    // Step 2: Create the new table manually (if it doesn't exist)
    console.log('\n2. Creating studio_studio_types table...');
    
    // Check if table exists first
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'studio_studio_types'
      );
    `;

    if (!tableExists[0].exists) {
      await prisma.$executeRaw`
        CREATE TABLE "studio_studio_types" (
          "id" TEXT NOT NULL,
          "studio_id" TEXT NOT NULL,
          "studio_type" "StudioType" NOT NULL,
          CONSTRAINT "studio_studio_types_pkey" PRIMARY KEY ("id")
        )
      `;

      await prisma.$executeRaw`
        CREATE UNIQUE INDEX "studio_studio_types_studio_id_studio_type_key" 
        ON "studio_studio_types"("studio_id", "studio_type")
      `;

      await prisma.$executeRaw`
        ALTER TABLE "studio_studio_types" 
        ADD CONSTRAINT "studio_studio_types_studio_id_fkey" 
        FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      console.log('✅ Table created successfully');
    } else {
      console.log('✅ Table already exists');
    }

    // Step 3: Migrate existing data
    console.log('\n3. Migrating existing studio type data...');
    let migratedCount = 0;

    for (const studio of studios) {
      try {
        await prisma.studioStudioType.create({
          data: {
            studioId: studio.id,
            studioType: studio.studioType as StudioType,
          },
        });
        migratedCount++;
        
        if (migratedCount % 100 === 0) {
          console.log(`  Migrated ${migratedCount}/${studios.length} studios...`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to migrate studio ${studio.id} (${studio.name}):`, error);
      }
    }

    console.log(`✅ Successfully migrated ${migratedCount} studios`);

    // Step 4: Verify migration
    console.log('\n4. Verifying migration...');
    const migratedTypes = await prisma.studioStudioType.findMany({
      select: {
        studioType: true
      }
    });

    const migratedTypeCounts = migratedTypes.reduce((acc, item) => {
      const type = item.studioType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Migrated studio type distribution:');
    Object.entries(migratedTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} studios`);
    });

    // Step 5: Test a few queries
    console.log('\n5. Testing queries...');
    const testStudio = await prisma.studio.findFirst({
      include: {
        studioTypes: true
      }
    });

    if (testStudio) {
      console.log(`✅ Test query successful - Studio "${testStudio.name}" has types:`, 
        testStudio.studioTypes.map(t => t.studioType));
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the application to ensure everything works');
    console.log('2. If everything looks good, run: npx prisma db push --accept-data-loss');
    console.log('3. This will remove the old studio_type column');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
safeMigration()
  .then(() => {
    console.log('Safe migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Safe migration failed:', error);
    process.exit(1);
  });

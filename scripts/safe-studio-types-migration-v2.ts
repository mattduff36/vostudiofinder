#!/usr/bin/env tsx

/**
 * Safe migration script for studio types on production database - Version 2
 * This script uses raw SQL to avoid Prisma client issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeMigration() {
  console.log('🚀 Starting safe studio types migration (v2)...');

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

    // Step 3: Migrate existing data using raw SQL
    console.log('\n3. Migrating existing studio type data...');
    
    // First, check if data already exists
    const existingCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "studio_studio_types"
    `;
    
    if (existingCount[0].count > 0) {
      console.log(`✅ Data already migrated (${existingCount[0].count} records found)`);
    } else {
      // Migrate data using raw SQL
      const result = await prisma.$executeRaw`
        INSERT INTO "studio_studio_types" ("id", "studio_id", "studio_type")
        SELECT 
          gen_random_uuid()::text as "id",
          "id" as "studio_id",
          "studio_type"
        FROM "studios"
        WHERE "studio_type" IS NOT NULL
      `;
      
      console.log(`✅ Successfully migrated ${result} studios using raw SQL`);
    }

    // Step 4: Verify migration
    console.log('\n4. Verifying migration...');
    const migratedTypes = await prisma.$queryRaw`
      SELECT "studio_type", COUNT(*) as count
      FROM "studio_studio_types"
      GROUP BY "studio_type"
      ORDER BY count DESC
    `;

    console.log('Migrated studio type distribution:');
    migratedTypes.forEach((item: any) => {
      console.log(`  ${item.studio_type}: ${item.count} studios`);
    });

    // Step 5: Test a few queries
    console.log('\n5. Testing queries...');
    const testStudio = await prisma.$queryRaw`
      SELECT s.name, sst.studio_type
      FROM "studios" s
      LEFT JOIN "studio_studio_types" sst ON s.id = sst.studio_id
      LIMIT 1
    `;

    if (testStudio && testStudio.length > 0) {
      console.log(`✅ Test query successful - Studio "${testStudio[0].name}" has type: ${testStudio[0].studio_type}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Regenerate Prisma client: npx prisma generate');
    console.log('2. Test the application to ensure everything works');
    console.log('3. If everything looks good, run: npx prisma db push --accept-data-loss');
    console.log('4. This will remove the old studio_type column');

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

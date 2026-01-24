/**
 * Production Migration Script: Enable Messages for All Profiles
 * 
 * This script:
 * 1. Updates show_email to true for all existing profiles
 * 2. Changes the default value to true for new profiles
 * 
 * CRITICAL: This connects to PRODUCTION database via .env.production
 * Run with: DATABASE_URL=$(cat .env.production | grep DATABASE_URL | cut -d '=' -f2-) npx tsx scripts/production-enable-messages.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function runProductionMigration() {
  // Verify we're using production database
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  console.log('⚠️  WARNING: About to run migration on database');
  console.log(`📍 Database: ${dbUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);
  console.log('');
  
  // Initialize Prisma client
  const prisma = new PrismaClient({
    datasourceUrl: dbUrl,
  });

  try {
    console.log('🔍 Checking current state...');
    
    // Check how many profiles currently have show_email = false
    const disabledCount = await prisma.studio_profiles.count({
      where: {
        show_email: false,
      },
    });

    console.log(`📊 Found ${disabledCount} profiles with messages disabled`);
    console.log('');

    if (disabledCount === 0) {
      console.log('✅ All profiles already have messages enabled. Nothing to do.');
      await prisma.$disconnect();
      return;
    }

    console.log(`🚀 Starting migration...`);
    console.log(`   - Updating ${disabledCount} profiles to enable messages`);
    console.log(`   - Changing default for new profiles to enabled`);
    console.log('');

    // Read and execute the standalone SQL script (not a Prisma migration)
    const sqlPath = path.join(process.cwd(), 'scripts', 'sql', 'enable-messages-default-true.sql');
    const migrationSql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement) {
        console.log(`📝 Executing: ${statement.substring(0, 60)}...`);
        await prisma.$executeRawUnsafe(statement);
      }
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    const enabledCount = await prisma.studio_profiles.count({
      where: {
        show_email: true,
      },
    });

    console.log('');
    console.log('📊 Final state:');
    console.log(`   - ${enabledCount} profiles with messages enabled`);
    console.log(`   - ${await prisma.studio_profiles.count()} total profiles`);
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    console.log('');
    console.log('🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✅ Disconnected safely');
  }
}

// Run the migration
console.log('═══════════════════════════════════════════════════════════');
console.log('  PRODUCTION MIGRATION: Enable Messages for All Profiles');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

runProductionMigration()
  .then(() => {
    console.log('');
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

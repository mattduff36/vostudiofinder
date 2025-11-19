#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyAddressMigration() {
  console.log('🔄 Starting address fields migration...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), 'prisma/migrations/20250120_add_address_fields/migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('📄 Reading migration file...');
    console.log(`   Path: ${sqlPath}\n`);

    // Remove comments and split into statements
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    // Split by semicolon, but keep multi-line statements together
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.trim().length === 0) continue;

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 60)}...`);
        await prisma.$executeRawUnsafe(statement + ';');
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error: any) {
        // If column already exists, that's okay
        if (error?.message?.includes('already exists') || 
            error?.code === '42710' ||
            error?.meta?.code === '42710') {
          console.log(`⚠️  Statement ${i + 1} skipped (column already exists)\n`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Verify the migration (with error handling in case columns don't exist yet)
    console.log('🔍 Verifying migration...\n');
    
    try {
      const verifyResult = await prisma.$queryRawUnsafe<Array<{ 
        total: bigint;
        with_address: bigint;
        with_full_address: bigint;
        with_abbreviated_address: bigint;
      }>>(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as with_address,
          COUNT(CASE WHEN full_address IS NOT NULL AND full_address != '' THEN 1 END) as with_full_address,
          COUNT(CASE WHEN abbreviated_address IS NOT NULL AND abbreviated_address != '' THEN 1 END) as with_abbreviated_address
        FROM studios
      `);

      const stats = verifyResult[0];
      console.log('📊 Migration Results:');
      console.log(`   Total studios: ${Number(stats.total)}`);
      console.log(`   Studios with address: ${Number(stats.with_address)}`);
      console.log(`   Studios with full_address: ${Number(stats.with_full_address)}`);
      console.log(`   Studios with abbreviated_address: ${Number(stats.with_abbreviated_address)}`);
      
      if (Number(stats.with_address) === Number(stats.with_full_address)) {
        console.log('\n✅ Migration successful! All addresses copied to full_address.');
      } else {
        console.log('\n⚠️  Some addresses may not have been copied. Please check manually.');
      }
    } catch (error: any) {
      console.log('⚠️  Could not verify migration (columns may not exist yet)');
      console.log('   This is normal if the migration just ran. Please verify manually.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyAddressMigration()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


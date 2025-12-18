import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load production environment variables
const envPath = path.join(process.cwd(), '.env.production');
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in .env.production');
  process.exit(1);
}

console.log('🔍 Using database:', process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'unknown');

const prisma = new PrismaClient();

async function applyMigrations() {
  try {
    console.log('\n📋 Applying migrations to PRODUCTION database...\n');

    // Migration 1: Add email verification token fields (created 2025-12-18)
    console.log('🔄 [1/2] Adding email verification token fields...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMPTZ
    `);
    console.log('✅ Email verification fields added');

    console.log('🔄 [2/2] Creating index for verification tokens...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)
    `);
    console.log('✅ Index created successfully');

    console.log('\n✅ All migrations applied successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying schema changes...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('verification_token', 'verification_token_expiry')
      ORDER BY column_name;
    ` as Array<{ column_name: string; data_type: string }>;

    if (result.length === 2) {
      console.log('✅ Verification successful:');
      result.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('⚠️  Warning: Expected 2 columns, found', result.length);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migrations
console.log('⚠️  WARNING: This will modify the PRODUCTION database!');
console.log('📁 Using environment file:', envPath);
console.log('');

applyMigrations()
  .then(() => {
    console.log('\n🎉 Production database migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Production migration failed:', error);
    process.exit(1);
  });

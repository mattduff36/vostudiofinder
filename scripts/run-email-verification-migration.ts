/**
 * Migration script to add email verification fields to users table
 * Run with: npx tsx scripts/run-email-verification-migration.ts
 */

import { db } from '../src/lib/db';

async function runMigration() {
  console.log('🔄 Running email verification migration...');
  
  try {
    // Add verification_token and verification_token_expiry columns
    await db.$executeRawUnsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verification_token TEXT,
      ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMPTZ;
    `);
    
    console.log('✅ Added verification columns to users table');

    // Create index for faster token lookup
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
    `);
    
    console.log('✅ Created index on verification_token');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

runMigration().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});

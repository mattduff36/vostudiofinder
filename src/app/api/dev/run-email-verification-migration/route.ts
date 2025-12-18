import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Development-only endpoint to run email verification migration
 * GET /api/dev/run-email-verification-migration
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    console.log('🔄 Running email verification migration...');
    
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

    return NextResponse.json({
      success: true,
      message: 'Email verification migration completed successfully',
      steps: [
        'Added verification_token column to users table',
        'Added verification_token_expiry column to users table',
        'Created index on verification_token for faster lookups',
      ],
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

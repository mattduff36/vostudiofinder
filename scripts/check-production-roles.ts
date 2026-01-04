/**
 * Check the role distribution in production database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load .env.production file
config({ path: resolve(process.cwd(), '.env.production') });

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

async function checkProductionRoles() {
  try {
    console.log('🔍 Checking PRODUCTION database roles...\n');
    console.log(`Database: ${prodUrl.split('@')[1]?.split('?')[0] || 'Unknown'}\n`);

    // Get role distribution (using raw SQL to catch any legacy roles)
    const rolesRaw: any[] = await db.$queryRaw`
      SELECT role::text as role, COUNT(*) as count 
      FROM users 
      GROUP BY role::text
      ORDER BY role::text
    `;

    console.log('📊 Role distribution in PRODUCTION:');
    rolesRaw.forEach((role) => {
      console.log(`   ${role.role}: ${role.count} users`);
    });

    console.log('\n✅ Check complete!\n');
  } catch (error) {
    console.error('❌ Error checking roles:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the check
checkProductionRoles()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];

if (!envArg || !['dev', 'production'].includes(envArg)) {
  console.error('❌ ERROR: Please specify environment with --env=dev or --env=production');
  console.error('\nUsage:');
  console.error('  npx tsx scripts/mark-admin-review-for-missing-coordinates.ts --env=dev');
  console.error('  npx tsx scripts/mark-admin-review-for-missing-coordinates.ts --env=production');
  console.error('\nAdd --dry-run to preview without making changes\n');
  process.exit(1);
}

const envFile = envArg === 'production' ? '.env.production' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  console.log(`📁 Loading environment from: ${envFile}`);
  console.log('🔍 Marking studios missing coordinates as Admin Review...\n');

  const where = {
    OR: [{ latitude: null }, { longitude: null }],
  } as const;

  const totalMissing = await prisma.studio_profiles.count({ where });
  console.log(`📊 Studios missing coordinates: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log('✅ Nothing to update.');
    return;
  }

  if (isDryRun) {
    console.log('🏃 DRY RUN MODE — no changes will be applied.\n');
    return;
  }

  if (envArg === 'production') {
    console.log('⚠️  WARNING: You are running this on the PRODUCTION database!');
    console.log('⚠️  This will set admin_review=true for all studios missing coordinates.');
    console.log('Press Ctrl+C to cancel, or wait 10 seconds to proceed...\n');
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  const result = await prisma.studio_profiles.updateMany({
    where,
    data: {
      admin_review: true,
      updated_at: new Date(),
    },
  });

  console.log(`✅ Updated ${result.count} studio(s): admin_review=true\n`);
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


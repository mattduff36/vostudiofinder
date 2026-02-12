import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

/**
 * Script to deactivate studio profiles that are missing address and coordinate information
 * 
 * A studio profile is considered incomplete if it has:
 * - No address fields (full_address, abbreviated_address, city, location all empty/null)
 * - AND no coordinates (latitude and longitude both null)
 * 
 * Usage:
 *   # Dev database (.env.local):
 *   tsx scripts/deactivate-studios-without-location.ts --env=dev
 * 
 *   # Production database (.env.production):
 *   tsx scripts/deactivate-studios-without-location.ts --env=production
 * 
 * Add --dry-run flag to preview changes without applying them:
 *   tsx scripts/deactivate-studios-without-location.ts --env=dev --dry-run
 */

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1];

if (!envArg || !['dev', 'production'].includes(envArg)) {
  console.error('❌ ERROR: Please specify environment with --env=dev or --env=production');
  console.error('\nUsage:');
  console.error('  tsx scripts/deactivate-studios-without-location.ts --env=dev');
  console.error('  tsx scripts/deactivate-studios-without-location.ts --env=production');
  console.error('\nAdd --dry-run to preview without making changes\n');
  process.exit(1);
}

// Load appropriate environment file
const envFile = envArg === 'production' ? '.env.production' : '.env.local';
const envPath = path.resolve(process.cwd(), envFile);
console.log(`📁 Loading environment from: ${envFile}\n`);

config({ path: envPath });

const prisma = new PrismaClient();

async function deactivateStudiosWithoutLocation() {
  // Show database connection info for safety
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`❌ ERROR: DATABASE_URL not found in ${envFile}`);
    console.error(`Make sure you have ${envFile} file with DATABASE_URL set\n`);
    process.exit(1);
  }

  // Mask the database URL for security but show enough to identify it
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':***@');
  console.log('🔗 Connected to database:');
  console.log(`   ${maskedUrl}\n`);

  console.log('🔍 Checking for ACTIVE studio profiles without location data...\n');

  try {
    // First, get all ACTIVE studios
    const allActiveStudios = await prisma.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        status: true,
        full_address: true,
        abbreviated_address: true,
        city: true,
        location: true,
        latitude: true,
        longitude: true,
        created_at: true,
        users: {
          select: {
            username: true,
            email: true,
            display_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filter to find studios that are missing BOTH address AND coordinates
    const studiosToDeactivate = allActiveStudios.filter(studio => {
      // Check if ALL address fields are empty/null
      const hasNoAddress = 
        (!studio.full_address || studio.full_address.trim() === '') &&
        (!studio.abbreviated_address || studio.abbreviated_address.trim() === '') &&
        (!studio.city || studio.city.trim() === '') &&
        (!studio.location || studio.location.trim() === '');
      
      // Check if coordinates are missing (0 is valid, only null/undefined counts as missing)
      const hasNoCoordinates =
        studio.latitude === null ||
        studio.latitude === undefined ||
        studio.longitude === null ||
        studio.longitude === undefined;
      
      // Deactivate only if BOTH conditions are true
      return hasNoAddress && hasNoCoordinates;
    });

    if (studiosToDeactivate.length === 0) {
      console.log('✅ No ACTIVE studios found without location data!');
      console.log('   All ACTIVE studios have either address or coordinate information.\n');
      return;
    }

    console.log(`📊 Found ${studiosToDeactivate.length} ACTIVE studio(s) without location data:\n`);

    // Show details of what will be deactivated
    studiosToDeactivate.forEach((studio, index) => {
      console.log(`${index + 1}. ${studio.name} (@${studio.users.username})`);
      console.log(`   Email: ${studio.users.email}`);
      console.log(`   Status: ${studio.status}`);
      console.log(`   Address fields: all empty/null`);
      console.log(`   Coordinates: none`);
      console.log(`   Created: ${studio.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });

    console.log(`\n📝 Total studios to deactivate: ${studiosToDeactivate.length}\n`);

    if (isDryRun) {
      console.log('🏃 DRY RUN MODE - No changes will be applied');
      console.log('Remove --dry-run flag to apply these changes\n');
      return;
    }

    // Extra confirmation for production
    if (envArg === 'production') {
      console.log('⚠️  WARNING: You are running this on the PRODUCTION database!');
      console.log('⚠️  This will set these studios to INACTIVE status!');
      console.log('Press Ctrl+C to cancel, or wait 10 seconds to proceed...\n');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } else {
      console.log('⚠️  WARNING: This will set these studios to INACTIVE status!');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log('🔄 Deactivating studios...\n');

    // Update studios to INACTIVE
    const result = await prisma.studio_profiles.updateMany({
      where: {
        id: {
          in: studiosToDeactivate.map(s => s.id),
        },
      },
      data: {
        status: 'INACTIVE',
        updated_at: new Date(),
      },
    });

    console.log(`✅ Successfully deactivated ${result.count} studio profile(s)\n`);
    
    console.log('📋 Summary:');
    console.log(`   - Studios checked: all ACTIVE profiles`);
    console.log(`   - Studios deactivated: ${result.count}`);
    console.log(`   - Reason: Missing both address fields AND coordinates`);
    console.log('\n✨ Operation completed successfully!\n');

    // Show next steps
    console.log('📌 Next Steps:');
    console.log('   - These studios will no longer appear in search results');
    console.log('   - Studio owners can reactivate by adding location information');
    console.log('   - Consider notifying affected users via email\n');

  } catch (error) {
    console.error('❌ Error deactivating studios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deactivateStudiosWithoutLocation()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

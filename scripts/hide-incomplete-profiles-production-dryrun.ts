import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load production environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

// Verify we're connecting to production
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.production');
  process.exit(1);
}

console.log('🔗 Connecting to production database...');
console.log(`📍 Database: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown'}\n`);

const db = new PrismaClient();

/**
 * DRY RUN - Show profiles that would be hidden (Production Database)
 * This script identifies studios that cannot be displayed on the map:
 * - Have null or undefined latitude/longitude coordinates
 * - Have an empty city field
 * 
 * NO CHANGES WILL BE MADE - This is a read-only dry run
 */
async function dryRunHideIncompleteProfiles() {
  console.log('🔍 DRY RUN: Finding studios with incomplete location data...\n');
  console.log('⚠️  NO CHANGES WILL BE MADE - This is a read-only analysis\n');

  try {
    // Find all studios that are currently visible but lack required location data
    const allVisibleStudios = await db.studio_profiles.findMany({
      where: {
        is_profile_visible: true,
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        city: true,
        created_at: true,
        users: {
          select: {
            email: true,
            username: true,
            membership_tier: true,
          },
        },
      },
    });

    console.log(`📊 Total visible studios in production: ${allVisibleStudios.length}`);

    // Filter in JavaScript for studios with incomplete location data
    const incompleteStudios = allVisibleStudios.filter((studio) => {
      const hasNoLatitude = studio.latitude === null || studio.latitude === undefined;
      const hasNoLongitude = studio.longitude === null || studio.longitude === undefined;
      const hasNoCity = !studio.city || studio.city.trim() === '';
      
      return hasNoLatitude || hasNoLongitude || hasNoCity;
    });

    console.log(`❌ Studios with incomplete location data: ${incompleteStudios.length}\n`);

    if (incompleteStudios.length === 0) {
      console.log('✅ No studios found with incomplete location data. All visible studios have coordinates and city.');
      await db.$disconnect();
      return;
    }

    console.log('═'.repeat(80));
    console.log('STUDIOS THAT WOULD BE HIDDEN:');
    console.log('═'.repeat(80));

    // Group by issue type for better reporting
    const missingCoords = incompleteStudios.filter(s => 
      s.latitude === null || s.latitude === undefined || 
      s.longitude === null || s.longitude === undefined
    );
    const emptyCity = incompleteStudios.filter(s => 
      (s.latitude !== null && s.latitude !== undefined && 
       s.longitude !== null && s.longitude !== undefined) &&
      (!s.city || s.city === '')
    );

    console.log(`\n📍 Missing Coordinates: ${missingCoords.length} studios`);
    console.log(`🏙️  Empty City Field: ${emptyCity.length} studios\n`);

    // Display details of studios that would be hidden
    incompleteStudios.forEach((studio, index) => {
      const issues = [];
      if (studio.latitude === null || studio.latitude === undefined) issues.push('missing latitude');
      if (studio.longitude === null || studio.longitude === undefined) issues.push('missing longitude');
      if (!studio.city || studio.city === '') issues.push('empty city');

      const membership = studio.users?.membership_tier || 'BASIC';
      const createdDate = new Date(studio.created_at).toLocaleDateString('en-GB');

      console.log(
        `${String(index + 1).padStart(3)}. ${studio.name}`
      );
      console.log(
        `     @${studio.users?.username || 'unknown'} | ${membership} | Created: ${createdDate}`
      );
      console.log(
        `     Issues: ${issues.join(', ')}`
      );
      console.log();
    });

    console.log('═'.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total visible studios: ${allVisibleStudios.length}`);
    console.log(`   Studios with incomplete data: ${incompleteStudios.length}`);
    console.log(`   Would remain visible: ${allVisibleStudios.length - incompleteStudios.length}`);
    console.log(`   Percentage affected: ${((incompleteStudios.length / allVisibleStudios.length) * 100).toFixed(1)}%`);
    
    // Breakdown by membership tier
    const basicIncomplete = incompleteStudios.filter(s => (s.users?.membership_tier || 'BASIC') === 'BASIC');
    const premiumIncomplete = incompleteStudios.filter(s => s.users?.membership_tier === 'PREMIUM');
    
    console.log(`\n📈 BREAKDOWN BY MEMBERSHIP:`);
    console.log(`   BASIC members affected: ${basicIncomplete.length}`);
    console.log(`   PREMIUM members affected: ${premiumIncomplete.length}`);

    console.log(`\n⚠️  These ${incompleteStudios.length} studios WOULD BE hidden if you run the actual script.`);
    console.log(`💡 They can be made visible again once they have valid coordinates and a city/region.\n`);

  } catch (error) {
    console.error('❌ Error during dry run:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the dry run script
dryRunHideIncompleteProfiles()
  .then(() => {
    console.log('✅ Dry run completed successfully - NO CHANGES WERE MADE.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Dry run failed:', error);
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * Hide profiles that cannot be displayed on the map
 * This script sets is_profile_visible to false for all studios that:
 * - Have null or undefined latitude/longitude coordinates
 * - Have an empty city field
 */
async function hideIncompleteProfiles() {
  console.log('🔍 Finding studios with incomplete location data...\n');

  try {
    // Find all studios that are currently visible but lack required location data
    // We need to fetch all visible studios and then filter them in JS
    // because Prisma has issues with complex OR queries on nullable string fields
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
        users: {
          select: {
            email: true,
            username: true,
          },
        },
      },
    });

    // Filter in JavaScript for studios with incomplete location data
    const incompleteStudios = allVisibleStudios.filter((studio) => {
      const hasNoLatitude = studio.latitude === null || studio.latitude === undefined;
      const hasNoLongitude = studio.longitude === null || studio.longitude === undefined;
      const hasNoCity = !studio.city || studio.city.trim() === '';
      
      return hasNoLatitude || hasNoLongitude || hasNoCity;
    });

    console.log(`Found ${incompleteStudios.length} studios with incomplete location data:\n`);

    if (incompleteStudios.length === 0) {
      console.log('✅ No studios found with incomplete location data. All visible studios have coordinates and city.');
      await db.$disconnect();
      return;
    }

    // Display details of studios that will be hidden
    incompleteStudios.forEach((studio, index) => {
      const issues = [];
      if (studio.latitude === null || studio.latitude === undefined) issues.push('missing latitude');
      if (studio.longitude === null || studio.longitude === undefined) issues.push('missing longitude');
      if (!studio.city || studio.city === '') issues.push('empty city');

      console.log(
        `${index + 1}. ${studio.name} (@${studio.users?.username || 'unknown'}) - ${issues.join(', ')}`
      );
    });

    console.log(
      `\n⚠️  These ${incompleteStudios.length} studios will be hidden from public view until their location data is complete.\n`
    );

    // Update all incomplete studios to hide them
    const result = await db.studio_profiles.updateMany({
      where: {
        id: {
          in: incompleteStudios.map((s) => s.id),
        },
      },
      data: {
        is_profile_visible: false,
        updated_at: new Date(),
      },
    });

    console.log(`✅ Successfully updated ${result.count} studio profiles to hidden.\n`);
    console.log(
      '💡 These studios can be made visible again once they have valid coordinates and a city/region.'
    );
  } catch (error) {
    console.error('❌ Error hiding incomplete profiles:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
hideIncompleteProfiles()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

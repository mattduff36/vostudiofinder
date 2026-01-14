import { db } from '../src/lib/db';

async function disableExactLocation() {
  console.log('Starting to disable exact location for all users...\n');

  try {
    // Update all profiles to disable exact location
    const result = await db.$executeRaw`
      UPDATE studio_profiles
      SET show_exact_location = false
      WHERE show_exact_location = true
    `;

    console.log(`✅ Updated ${result} profile(s)\n`);

    // Verify the update
    const stats = await db.$queryRaw<Array<{
      total_profiles: bigint;
      exact_location_on: bigint;
      exact_location_off: bigint;
    }>>`
      SELECT 
        COUNT(*) as total_profiles,
        SUM(CASE WHEN show_exact_location = true THEN 1 ELSE 0 END) as exact_location_on,
        SUM(CASE WHEN show_exact_location = false THEN 1 ELSE 0 END) as exact_location_off
      FROM studio_profiles
    `;

    console.log('Current status:');
    console.log(`Total profiles: ${stats[0].total_profiles}`);
    console.log(`Exact location ON: ${stats[0].exact_location_on}`);
    console.log(`Exact location OFF: ${stats[0].exact_location_off}`);
  } catch (error) {
    console.error('Error disabling exact location:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

disableExactLocation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

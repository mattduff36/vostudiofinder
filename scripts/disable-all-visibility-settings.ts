import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

/**
 * Script to disable all visibility settings for all user profiles
 * 
 * This will set the following fields to false for ALL profiles:
 * - show_email
 * - show_phone
 * - show_address
 * - show_directions
 * 
 * Usage:
 *   tsx scripts/disable-all-visibility-settings.ts
 * 
 * Add --dry-run flag to preview changes without applying them:
 *   tsx scripts/disable-all-visibility-settings.ts --dry-run
 */

async function disableAllVisibilitySettings() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔍 Checking user profiles...\n');

  try {
    // Get all user profiles with current visibility settings
    const profiles = await prisma.user_profiles.findMany({
      select: {
        id: true,
        user_id: true,
        show_email: true,
        show_phone: true,
        show_address: true,
        show_directions: true,
        users: {
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

    console.log(`Found ${profiles.length} user profiles\n`);

    // Filter profiles that have any visibility settings enabled
    const profilesToUpdate = profiles.filter(
      (profile) =>
        profile.show_email ||
        profile.show_phone ||
        profile.show_address ||
        profile.show_directions
    );

    if (profilesToUpdate.length === 0) {
      console.log('✅ All visibility settings are already disabled!');
      return;
    }

    console.log(`📊 Profiles with visibility settings enabled: ${profilesToUpdate.length}\n`);

    // Show summary of what will be changed
    console.log('Settings that will be disabled:\n');
    let totalChanges = 0;

    profilesToUpdate.forEach((profile, index) => {
      const changes: string[] = [];
      if (profile.show_email) changes.push('show_email');
      if (profile.show_phone) changes.push('show_phone');
      if (profile.show_address) changes.push('show_address');
      if (profile.show_directions) changes.push('show_directions');

      totalChanges += changes.length;

      console.log(
        `${index + 1}. ${profile.users.username || profile.users.email} - ${changes.join(', ')}`
      );
    });

    console.log(`\n📝 Total changes: ${totalChanges} settings across ${profilesToUpdate.length} profiles\n`);

    if (isDryRun) {
      console.log('🏃 DRY RUN MODE - No changes will be applied');
      console.log('Remove --dry-run flag to apply these changes\n');
      return;
    }

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will disable ALL visibility settings for these profiles!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    // Wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('🔄 Updating profiles...\n');

    // Update all profiles to disable visibility settings
    const result = await prisma.user_profiles.updateMany({
      where: {
        OR: [
          { show_email: true },
          { show_phone: true },
          { show_address: true },
          { show_directions: true },
        ],
      },
      data: {
        show_email: false,
        show_phone: false,
        show_address: false,
        show_directions: false,
      },
    });

    console.log(`✅ Successfully updated ${result.count} profiles`);
    console.log('\n📋 Summary:');
    console.log(`   - show_email: disabled for all`);
    console.log(`   - show_phone: disabled for all`);
    console.log(`   - show_address: disabled for all`);
    console.log(`   - show_directions: disabled for all`);
    console.log('\n✨ All visibility settings have been disabled!\n');
  } catch (error) {
    console.error('❌ Error updating visibility settings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
disableAllVisibilitySettings()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

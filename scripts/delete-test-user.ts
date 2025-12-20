import { db } from '../src/lib/db';

async function deleteTestUser() {
  const email = 'mattduff36@gmail.com';
  const username = 'FredStudios';

  try {
    console.log(`🔍 Looking for user: ${email} or ${username}...`);

    // Find the user
    const user = await db.users.findFirst({
      where: {
        OR: [
          { email },
          { username: { equals: username, mode: 'insensitive' } }
        ]
      },
      include: {
        studio_profiles: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.email} (${user.username})`);

    // Delete studio profile and related data if exists
    if (user.studio_profiles) {
      console.log('🗑️  Deleting studio profile...');
      
      // Delete studio images
      await db.studio_images.deleteMany({
        where: { studio_id: user.studio_profiles.id }
      });
      console.log('  ✅ Deleted studio images');

      // Delete studio types
      await db.studio_studio_types.deleteMany({
        where: { studio_id: user.studio_profiles.id }
      });
      console.log('  ✅ Deleted studio types');

      // Delete studio profile
      await db.studio_profiles.delete({
        where: { id: user.studio_profiles.id }
      });
      console.log('  ✅ Deleted studio profile');
    }

    // Delete the user (this will cascade delete accounts, sessions, etc.)
    await db.users.delete({
      where: { id: user.id }
    });
    console.log('✅ Deleted user account');

    console.log('');
    console.log('✨ Cleanup complete! You can now sign up again.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await db.$disconnect();
  }
}

deleteTestUser();







import { db } from '../src/lib/db';

async function main() {
  console.log('🔧 Making VoiceoverGuy an admin...');

  try {
    // Find the VoiceoverGuy user by username
    const user = await db.users.findUnique({
      where: { username: 'VoiceoverGuy' },
    });

    if (!user) {
      console.error('❌ User with username "VoiceoverGuy" not found');
      return;
    }

    // Update the user's role to ADMIN
    const updatedUser = await db.users.update({
      where: { username: 'VoiceoverGuy' },
      data: { role: 'ADMIN' },
    });

    console.log('✅ Successfully updated VoiceoverGuy to ADMIN role');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Username: ${updatedUser.username}`);
    console.log(`   Role: ${updatedUser.role}`);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });


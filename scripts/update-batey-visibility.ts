import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating Batey Studios visibility settings...\n');

  const user = await prisma.users.findUnique({
    where: { username: 'bateystudios' },
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  // Update studio visibility
  const studio = await prisma.studios.updateMany({
    where: { owner_id: user.id },
    data: {
      is_profile_visible: false,
      updated_at: new Date(),
    },
  });

  console.log(`✓ Updated ${studio.count} studio(s) - Profile visibility set to OFF`);

  // Create user_profiles if it doesn't exist, with show_directions = false
  const existingProfile = await prisma.user_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!existingProfile) {
    await prisma.user_profiles.create({
      data: {
        id: randomUUID(),
        user_id: user.id,
        show_directions: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log('✓ Created user_profiles record with show_directions OFF');
  } else {
    await prisma.user_profiles.update({
      where: { user_id: user.id },
      data: {
        show_directions: false,
        updated_at: new Date(),
      },
    });
    console.log('✓ Updated user_profiles - show_directions set to OFF');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✓ Visibility settings updated successfully!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\nCurrent settings:');
  console.log('  - Profile Visibility (is_profile_visible): OFF');
  console.log('  - Show Directions (show_directions): OFF');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



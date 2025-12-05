import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test user: Ady Batt (bateystudios)...\n');

  // Get password from environment variable (never commit passwords to git!)
  const password = process.env.BATEY_TEST_PASSWORD;
  if (!password) {
    throw new Error('BATEY_TEST_PASSWORD environment variable is required');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate IDs
  const userId = randomUUID();
  const studioId = randomUUID();

  try {
    // Create the user
    const user = await prisma.users.create({
      data: {
        id: userId,
        email: 'adrian.batt@outlook.com',
        username: 'bateystudios',
        display_name: 'Ady Batt',
        password: hashedPassword,
        role: 'USER',
        email_verified: true,
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log('✓ User created successfully:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Display Name: ${user.display_name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Email Verified: ${user.email_verified}`);
    console.log('');

    // Create the studio
    const studio = await prisma.studios.create({
      data: {
        id: studioId,
        owner_id: userId,
        name: 'Batey Studios LTD',
        city: '', // Empty until user adds full address
        is_premium: false,
        is_verified: false,
        is_profile_visible: false, // Default to hidden for new profiles
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log('✓ Studio created successfully:');
    console.log(`  ID: ${studio.id}`);
    console.log(`  Name: ${studio.name}`);
    console.log(`  Owner ID: ${studio.owner_id}`);
    console.log(`  Status: ${studio.status}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✓ Test profile created successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nLogin credentials:');
    console.log(`  Email: adrian.batt@outlook.com`);
    console.log(`  Username: bateystudios`);
    console.log(`  Password: [from BATEY_TEST_PASSWORD env var]`);
    console.log('\nProfile URL: /profile/bateystudios');
    console.log('\nNote: user_profiles table is empty - user can build profile through the site');
    console.log('');

  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

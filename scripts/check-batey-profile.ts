import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Batey Studios profile data...\n');

  const user = await prisma.users.findUnique({
    where: { username: 'bateystudios' },
    include: {
      user_profiles: true,
      studios: true,
    },
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('=== USER DATA ===');
  console.log(JSON.stringify(user, null, 2));

  console.log('\n=== STUDIO DATA ===');
  if (user.studios && user.studios.length > 0) {
    console.log(JSON.stringify(user.studios[0], null, 2));
  } else {
    console.log('No studios found');
  }

  console.log('\n=== USER PROFILE DATA ===');
  if (user.user_profiles) {
    console.log(JSON.stringify(user.user_profiles, null, 2));
  } else {
    console.log('No user_profiles record found');
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



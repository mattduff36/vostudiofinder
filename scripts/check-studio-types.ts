import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking studio types for bateystudios...\n');

  const user = await prisma.users.findUnique({
    where: { username: 'bateystudios' },
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  const studio = await prisma.studios.findFirst({
    where: {
      owner_id: user.id
    },
    include: {
      studio_studio_types: true,
    },
  });

  if (!studio) {
    console.log('Studio not found!');
    return;
  }

  console.log('Studio ID:', studio.id);
  console.log('Studio Types:');
  console.log(JSON.stringify(studio.studio_studio_types, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



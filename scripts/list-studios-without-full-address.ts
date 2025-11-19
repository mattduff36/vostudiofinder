import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listStudiosWithoutFullAddress() {
  console.log('🔍 Finding studios with coordinates but no full_address...\n');

  try {
    // Find studios that have coordinates but no full_address
    const studios = await prisma.studios.findMany({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } },
          {
            OR: [
              { full_address: null },
              { full_address: '' },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        owner_id: true,
        latitude: true,
        longitude: true,
        full_address: true,
        abbreviated_address: true,
        address: true, // Legacy field
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`📊 Found ${studios.length} studios with coordinates but no full_address\n`);
    console.log('='.repeat(80));

    if (studios.length === 0) {
      console.log('✅ All studios with coordinates already have full_address populated!');
      return;
    }

    // Display the studios
    studios.forEach((studio, index) => {
      console.log(`\n${index + 1}. ${studio.name}`);
      console.log(`   ID: ${studio.id}`);
      console.log(`   Owner ID: ${studio.owner_id}`);
      console.log(`   Coordinates: ${studio.latitude}, ${studio.longitude}`);
      console.log(`   Legacy Address: ${studio.address || '(none)'}`);
      console.log(`   Full Address: ${studio.full_address || '(missing)'}`);
      console.log(`   Abbreviated Address: ${studio.abbreviated_address || '(none)'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary: ${studios.length} studios need full_address populated from coordinates`);
  } catch (error) {
    console.error('❌ Error querying studios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listStudiosWithoutFullAddress();


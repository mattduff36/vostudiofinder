import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listStudiosWithCoordinates() {
  console.log('🔍 Finding all studios with coordinates...\n');

  try {
    // Find all studios that have coordinates
    const studios = await prisma.studios.findMany({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
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

    console.log(`📊 Found ${studios.length} studios with coordinates\n`);
    console.log('='.repeat(80));

    if (studios.length === 0) {
      console.log('ℹ️  No studios have coordinates');
      return;
    }

    // Display the studios
    studios.forEach((studio, index) => {
      console.log(`\n${index + 1}. ${studio.name}`);
      console.log(`   ID: ${studio.id}`);
      console.log(`   Coordinates: ${studio.latitude}, ${studio.longitude}`);
      console.log(`   Legacy Address: ${studio.address || '(none)'}`);
      console.log(`   Full Address: ${studio.full_address || '(missing)'}`);
      console.log(`   Abbreviated Address: ${studio.abbreviated_address || '(none)'}`);
      
      // Check if full_address matches legacy address (indicating it was just copied)
      if (studio.full_address && studio.address && studio.full_address === studio.address) {
        console.log(`   ⚠️  Full address matches legacy address (may need reverse geocoding)`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary: ${studios.length} studios have coordinates`);
    
    // Count how many have full_address that matches legacy address
    const matchingAddresses = studios.filter(
      s => s.full_address && s.address && s.full_address === s.address
    ).length;
    
    if (matchingAddresses > 0) {
      console.log(`\n⚠️  ${matchingAddresses} studios have full_address that matches legacy address`);
      console.log('   These may benefit from reverse geocoding to get properly formatted addresses');
    }
  } catch (error) {
    console.error('❌ Error querying studios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listStudiosWithCoordinates();


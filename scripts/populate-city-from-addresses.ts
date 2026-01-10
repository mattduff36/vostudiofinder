import { PrismaClient } from '@prisma/client';
import { extractCity } from '../src/lib/utils/address';

const prisma = new PrismaClient();

async function populateCityFromAddresses() {
  console.log('🔄 Starting city field population from existing addresses...\n');

  try {
    // Find all studios with full_address
    const studiosToUpdate = await prisma.studios.findMany({
      where: {
        full_address: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        full_address: true,
        city: true,
      },
    });

    console.log(`📊 Found ${studiosToUpdate.length} studios to update\n`);

    if (studiosToUpdate.length === 0) {
      console.log('✅ No studios need updating. Migration complete!');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const studio of studiosToUpdate) {
      if (!studio.full_address) {
        skipped++;
        continue;
      }

      try {
        // Extract city from full address
        const city = extractCity(studio.full_address);

        if (!city || city.trim() === '') {
          console.log(`⚠️  Could not extract city from address for studio: ${studio.name} (ID: ${studio.id})`);
          console.log(`   Address: ${studio.full_address}`);
          skipped++;
          continue;
        }

        // Update the studio with the extracted city
        await prisma.studios.update({
          where: { id: studio.id },
          data: {
            city: city.trim(),
          },
        });

        updated++;
        console.log(`✅ Updated studio: ${studio.name} (ID: ${studio.id})`);
        console.log(`   Address: ${studio.full_address}`);
        console.log(`   City: ${city.trim()}`);
        console.log('');
      } catch (error) {
        errors++;
        console.error(`❌ Error updating studio ${studio.id}:`, error);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${studiosToUpdate.length}`);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
populateCityFromAddresses()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


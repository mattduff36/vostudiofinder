import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { extractCity } from '../src/lib/utils/address';
import { resolve } from 'path';

// Load environment variables from both .env and .env.local
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();

async function repopulateCities() {
  console.log('🔄 Re-populating city fields with improved extraction logic...\n');

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

    console.log(`📊 Found ${studiosToUpdate.length} studios to process\n`);

    if (studiosToUpdate.length === 0) {
      console.log('✅ No studios need updating.');
      return;
    }

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (const studio of studiosToUpdate) {
      if (!studio.full_address) {
        unchanged++;
        continue;
      }

      try {
        // Extract city from full address using improved logic
        const newCity = extractCity(studio.full_address);
        const oldCity = studio.city || '';

        if (!newCity || newCity.trim() === '') {
          console.log(`⚠️  Could not extract city for: ${studio.name} (ID: ${studio.id})`);
          console.log(`   Address: ${studio.full_address}`);
          console.log('');
          unchanged++;
          continue;
        }

        // Check if city changed
        if (oldCity === newCity.trim()) {
          unchanged++;
          continue;
        }

        // Update the studio with the new city
        await prisma.studios.update({
          where: { id: studio.id },
          data: {
            city: newCity.trim(),
          },
        });

        updated++;
        console.log(`✅ Updated: ${studio.name} (ID: ${studio.id})`);
        console.log(`   Address: ${studio.full_address}`);
        console.log(`   Old City: "${oldCity}" → New City: "${newCity.trim()}"`);
        console.log('');
      } catch (error) {
        errors++;
        console.error(`❌ Error updating studio ${studio.id}:`, error);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Unchanged: ${unchanged}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n✅ City field re-population complete!`);
  } catch (error) {
    console.error('❌ Fatal error during city re-population:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

repopulateCities().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});


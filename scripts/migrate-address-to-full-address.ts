import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAddressToFullAddress() {
  console.log('🔄 Starting address migration...\n');

  try {
    // Find all studios with address but no full_address
    const studiosToUpdate = await prisma.studios.findMany({
      where: {
        address: {
          not: null,
        },
        OR: [
          { full_address: null },
          { full_address: '' },
        ],
      },
      select: {
        id: true,
        name: true,
        address: true,
        full_address: true,
        abbreviated_address: true,
      },
    });

    console.log(`📊 Found ${studiosToUpdate.length} studios to update\n`);

    if (studiosToUpdate.length === 0) {
      console.log('✅ No studios need updating. Migration complete!');
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const studio of studiosToUpdate) {
      if (!studio.address) {
        skipped++;
        continue;
      }

      try {
        await prisma.studios.update({
          where: { id: studio.id },
          data: {
            full_address: studio.address,
            // Also set abbreviated_address if it's empty
            abbreviated_address: studio.abbreviated_address || studio.address,
          },
        });

        updated++;
        console.log(`✅ Updated studio: ${studio.name} (ID: ${studio.id})`);
        console.log(`   Address: ${studio.address}`);
      } catch (error) {
        console.error(`❌ Error updating studio ${studio.id}:`, error);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
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
migrateAddressToFullAddress()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


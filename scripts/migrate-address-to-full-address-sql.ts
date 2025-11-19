import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAddressToFullAddress() {
  console.log('🔄 Starting address migration using raw SQL...\n');

  try {
    // First, check how many studios have addresses
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM studios 
      WHERE address IS NOT NULL AND address != ''
    `;

    const totalCount = Number(countResult[0]?.count || 0);
    console.log(`📊 Found ${totalCount} studios with addresses\n`);

    if (totalCount === 0) {
      console.log('✅ No studios need updating. Migration complete!');
      return;
    }

    // Update all studios: copy address to full_address and abbreviated_address
    const result = await prisma.$executeRaw`
      UPDATE studios 
      SET 
        full_address = address,
        abbreviated_address = COALESCE(abbreviated_address, address)
      WHERE address IS NOT NULL 
        AND address != ''
        AND (full_address IS NULL OR full_address = '')
    `;

    const updatedCount = Number(result);
    console.log(`✅ Updated ${updatedCount} studios`);
    console.log('   - Copied address → full_address');
    console.log('   - Set abbreviated_address if it was empty');
    console.log('\n✅ Migration complete!');

    // Verify the update
    const verifyResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM studios 
      WHERE address IS NOT NULL 
        AND address != ''
        AND full_address IS NOT NULL
        AND full_address != ''
    `;

    const verifiedCount = Number(verifyResult[0]?.count || 0);
    console.log(`\n🔍 Verification: ${verifiedCount} studios now have full_address set`);

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


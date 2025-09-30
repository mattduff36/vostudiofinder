import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStudioTypes() {
  console.log('Starting studio type migration...');
  
  try {
    // First, let's see what studio types currently exist using raw SQL
    const typeCounts = await prisma.$queryRaw<Array<{ studio_type: string; count: bigint }>>`
      SELECT studio_type, COUNT(*) as count 
      FROM studios 
      GROUP BY studio_type 
      ORDER BY count DESC
    `;

    console.log('\nCurrent studio types in database:');
    typeCounts.forEach(({ studio_type, count }) => {
      console.log(`  ${studio_type}: ${count} studios`);
    });

    // Add VOICEOVER to the enum if it doesn't exist
    console.log('\nAdding VOICEOVER to StudioType enum...');
    await prisma.$executeRaw`ALTER TYPE "StudioType" ADD VALUE IF NOT EXISTS 'VOICEOVER'`;
    console.log('✅ VOICEOVER added to enum');

    // Migrate HOME to VOICEOVER using raw SQL
    const homeCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM studios WHERE studio_type = 'HOME'
    `;
    
    const homeStudiosCount = Number(homeCount[0].count);
    if (homeStudiosCount > 0) {
      console.log(`\nMigrating ${homeStudiosCount} HOME studios to VOICEOVER...`);
      await prisma.$executeRaw`
        UPDATE studios 
        SET studio_type = 'VOICEOVER' 
        WHERE studio_type = 'HOME'
      `;
      console.log(`✅ Updated ${homeStudiosCount} studios from HOME to VOICEOVER`);
    }

    // RECORDING stays the same, but let's verify
    const recordingCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM studios WHERE studio_type = 'RECORDING'
    `;
    console.log(`\n✅ ${Number(recordingCount[0].count)} RECORDING studios remain unchanged`);

    // Check for other types that need manual review
    const otherTypes = await prisma.$queryRaw<Array<{ studio_type: string; count: bigint }>>`
      SELECT studio_type, COUNT(*) as count 
      FROM studios 
      WHERE studio_type NOT IN ('VOICEOVER', 'RECORDING', 'PODCAST')
      GROUP BY studio_type 
      ORDER BY count DESC
    `;

    if (otherTypes.length > 0) {
      console.log('\n⚠️  Studios with types that need manual review:');
      otherTypes.forEach(({ studio_type, count }) => {
        console.log(`  ${studio_type}: ${count} studios`);
      });

      console.log('\nThese studio types are not in the new simplified enum:');
      for (const { studio_type } of otherTypes) {
        const studios = await prisma.$queryRaw<Array<{ name: string }>>`
          SELECT name FROM studios WHERE studio_type = ${studio_type} LIMIT 5
        `;
        console.log(`\n${studio_type} studios (showing first 5):`);
        studios.forEach(studio => {
          console.log(`  - ${studio.name}`);
        });
      }
    }

    // Final summary
    console.log('\n📊 Final Migration Summary:');
    const finalCounts = await prisma.$queryRaw<Array<{ studio_type: string; count: bigint }>>`
      SELECT studio_type, COUNT(*) as count 
      FROM studios 
      GROUP BY studio_type 
      ORDER BY count DESC
    `;
    
    finalCounts.forEach(({ studio_type, count }) => {
      console.log(`  ${studio_type}: ${count} studios`);
    });

    console.log('\n✅ Studio type migration completed!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateStudioTypes()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

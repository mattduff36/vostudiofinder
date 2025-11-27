import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupStudio {
  id: string;
  name: string;
  address: string | null;
  full_address: string | null;
  abbreviated_address: string | null;
}

async function restoreAddressesFromBackup() {
  console.log('🔄 Starting address restoration from backup...\n');

  try {
    // Read the backup file
    const backupPath = path.join(process.cwd(), 'backups/database_backup_2025-11-23T12-02-43-304Z.json');
    console.log(`📄 Reading backup file: ${backupPath}`);
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const backupStudios: BackupStudio[] = backupData.tables?.studios || backupData.studios || [];

    if (backupStudios.length === 0) {
      console.log('❌ No studios found in backup file');
      return;
    }

    console.log(`📊 Found ${backupStudios.length} studios in backup\n`);

    let restored = 0;
    let skipped = 0;
    let errors = 0;
    let notFound = 0;

    for (const backupStudio of backupStudios) {
      // Only restore if backup has full_address data
      if (!backupStudio.full_address && !backupStudio.abbreviated_address) {
        skipped++;
        continue;
      }

      try {
        // Check if studio still exists in database
        const currentStudio = await prisma.studios.findUnique({
          where: { id: backupStudio.id },
          select: {
            id: true,
            name: true,
            address: true,
            full_address: true,
            abbreviated_address: true,
          },
        });

        if (!currentStudio) {
          notFound++;
          continue;
        }

        // Only restore if current data looks incorrect
        // (i.e., full_address matches the legacy address field, indicating it was overwritten)
        const needsRestore = 
          (backupStudio.full_address && 
           backupStudio.full_address !== currentStudio.full_address) ||
          (backupStudio.abbreviated_address && 
           backupStudio.abbreviated_address !== currentStudio.abbreviated_address);

        if (!needsRestore) {
          skipped++;
          continue;
        }

        // Restore the addresses
        await prisma.studios.update({
          where: { id: backupStudio.id },
          data: {
            full_address: backupStudio.full_address,
            abbreviated_address: backupStudio.abbreviated_address,
          },
        });

        restored++;
        console.log(`✅ Restored: ${backupStudio.name}`);
        console.log(`   Full Address: ${backupStudio.full_address}`);
        console.log(`   Abbreviated: ${backupStudio.abbreviated_address}`);
        console.log('');
      } catch (error) {
        errors++;
        console.error(`❌ Error restoring studio ${backupStudio.id}:`, error);
      }
    }

    console.log(`\n📈 Restoration Summary:`);
    console.log(`   ✅ Restored: ${restored}`);
    console.log(`   ⏭️  Skipped (no change needed): ${skipped}`);
    console.log(`   🔍 Not found in database: ${notFound}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${backupStudios.length}`);
    console.log('\n✅ Restoration complete!');

  } catch (error) {
    console.error('❌ Restoration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
restoreAddressesFromBackup()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


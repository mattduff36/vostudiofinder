/**
 * One-Time Migration Script: Clean Up Studio Types
 * 
 * This script processes all studios in the database and:
 * 1. If a studio has at least one valid type (HOME, RECORDING, PODCAST):
 *    - Remove invalid types (VOICEOVER, VO_COACH, EDITING)
 *    - Keep studio ACTIVE
 * 
 * 2. If a studio has NO valid types:
 *    - Set studio status to INACTIVE
 *    - Keep all existing types for manual review
 * 
 * Usage:
 *   npm run ts-node scripts/migrate-studio-types.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuration
const VALID_TYPES = ['HOME', 'RECORDING', 'PODCAST'] as const;
const INVALID_TYPES = ['VOICEOVER', 'VO_COACH', 'EDITING'] as const;

// Check if running in dry-run mode
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

interface StudioWithTypes {
  id: string;
  name: string;
  status: string;
  studio_studio_types: Array<{
    id: string;
    studio_type: string;
  }>;
}

interface MigrationStats {
  totalStudios: number;
  studiosWithValidTypes: number;
  studiosWithoutValidTypes: number;
  invalidTypesRemoved: number;
  studiosDeactivated: number;
  errors: number;
}

async function migrateStudioTypes() {
  console.log('='.repeat(80));
  console.log('Studio Types Migration Script');
  console.log('='.repeat(80));
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE RUN (changes will be applied)'}`);
  console.log('');

  const stats: MigrationStats = {
    totalStudios: 0,
    studiosWithValidTypes: 0,
    studiosWithoutValidTypes: 0,
    invalidTypesRemoved: 0,
    studiosDeactivated: 0,
    errors: 0,
  };

  try {
    // Fetch all studios with their types
    console.log('📊 Fetching all studios...');
    const studios = await prisma.studios.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        studio_studio_types: {
          select: {
            id: true,
            studio_type: true,
          },
        },
      },
    });

    stats.totalStudios = studios.length;
    console.log(`✓ Found ${stats.totalStudios} studios\n`);

    // Create a backup log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupLog: Array<{
      studioId: string;
      studioName: string;
      action: string;
      details: any;
    }> = [];

    // Process each studio
    for (const studio of studios) {
      try {
        const studioTypes = studio.studio_studio_types.map(st => st.studio_type);
        const hasValidType = studioTypes.some(type => VALID_TYPES.includes(type as any));
        const hasInvalidType = studioTypes.some(type => INVALID_TYPES.includes(type as any));

        console.log(`\n📍 Processing: ${studio.name} (${studio.id})`);
        console.log(`   Current types: ${studioTypes.join(', ')}`);
        console.log(`   Current status: ${studio.status}`);

        // Scenario 1: Studio has at least one valid type
        if (hasValidType) {
          stats.studiosWithValidTypes++;

          if (hasInvalidType) {
            const invalidTypeIds = studio.studio_studio_types
              .filter(st => INVALID_TYPES.includes(st.studio_type as any))
              .map(st => st.id);

            console.log(`   ✓ Has valid types`);
            console.log(`   ⚠️  Found ${invalidTypeIds.length} invalid types to remove:`, 
              studio.studio_studio_types
                .filter(st => INVALID_TYPES.includes(st.studio_type as any))
                .map(st => st.studio_type)
            );

            backupLog.push({
              studioId: studio.id,
              studioName: studio.name,
              action: 'REMOVE_INVALID_TYPES',
              details: {
                originalTypes: studioTypes,
                removedTypes: studio.studio_studio_types
                  .filter(st => INVALID_TYPES.includes(st.studio_type as any))
                  .map(st => st.studio_type),
                remainingTypes: studioTypes.filter(type => !INVALID_TYPES.includes(type as any)),
              },
            });

            if (!isDryRun) {
              await prisma.studio_studio_types.deleteMany({
                where: {
                  id: {
                    in: invalidTypeIds,
                  },
                },
              });
              console.log(`   ✅ Removed ${invalidTypeIds.length} invalid types`);
              stats.invalidTypesRemoved += invalidTypeIds.length;
            } else {
              console.log(`   🔍 [DRY RUN] Would remove ${invalidTypeIds.length} invalid types`);
            }
          } else {
            console.log(`   ✓ Has valid types, no invalid types to remove`);
          }
        }
        // Scenario 2: Studio has NO valid types
        else {
          stats.studiosWithoutValidTypes++;
          console.log(`   ❌ No valid types found`);
          console.log(`   ⚠️  Will deactivate studio (types preserved for review)`);

          backupLog.push({
            studioId: studio.id,
            studioName: studio.name,
            action: 'DEACTIVATE_STUDIO',
            details: {
              originalStatus: studio.status,
              newStatus: 'INACTIVE',
              preservedTypes: studioTypes,
            },
          });

          if (!isDryRun && studio.status !== 'INACTIVE') {
            await prisma.studios.update({
              where: { id: studio.id },
              data: { status: 'INACTIVE' },
            });
            console.log(`   ✅ Studio deactivated`);
            stats.studiosDeactivated++;
          } else if (isDryRun) {
            console.log(`   🔍 [DRY RUN] Would deactivate studio`);
          } else {
            console.log(`   ℹ️  Studio already inactive`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing studio ${studio.name}:`, error);
        stats.errors++;
        backupLog.push({
          studioId: studio.id,
          studioName: studio.name,
          action: 'ERROR',
          details: { error: String(error) },
        });
      }
    }

    // Save backup log
    if (!isDryRun) {
      const logsDir = path.join(process.cwd(), 'logs');
      
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logPath = path.join(logsDir, `studio-types-migration-${timestamp}.json`);
      fs.writeFileSync(logPath, JSON.stringify(backupLog, null, 2));
      console.log(`\n💾 Backup log saved to: ${logPath}`);
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total studios processed:        ${stats.totalStudios}`);
    console.log(`Studios with valid types:       ${stats.studiosWithValidTypes}`);
    console.log(`Studios without valid types:    ${stats.studiosWithoutValidTypes}`);
    console.log(`Invalid types removed:          ${stats.invalidTypesRemoved}`);
    console.log(`Studios deactivated:            ${stats.studiosDeactivated}`);
    console.log(`Errors encountered:             ${stats.errors}`);
    console.log('='.repeat(80));

    if (isDryRun) {
      console.log('\n✓ Dry run completed. No changes were made.');
      console.log('Run without --dry-run flag to apply changes.');
    } else {
      console.log('\n✓ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateStudioTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });

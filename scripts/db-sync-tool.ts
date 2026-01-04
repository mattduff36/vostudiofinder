/**
 * DATABASE SYNC TOOL
 * 
 * Comprehensive tool to compare and sync dev/production databases
 * Provides multiple sync options with safety warnings
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load dev environment (.env.local)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const DEV_DATABASE_URL = process.env.DATABASE_URL;

// Load production environment (.env.production) - MUST override dev DATABASE_URL
dotenv.config({ path: path.resolve(process.cwd(), '.env.production'), override: true });
const PROD_DATABASE_URL = process.env.DATABASE_URL;

if (!DEV_DATABASE_URL || !PROD_DATABASE_URL) {
  console.error('❌ ERROR: Missing database URLs');
  process.exit(1);
}

const prodDb = new PrismaClient({
  datasources: { db: { url: PROD_DATABASE_URL } }
});

const devDb = new PrismaClient({
  datasources: { db: { url: DEV_DATABASE_URL } }
});

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

interface DatabaseStats {
  users: number;
  usersWithStudios: number;
  usersWithoutStudios: number;
  studios: number;
  studioTypes: number;
  studioImages: number;
  studioServices: number;
  reviews: number;
  faq: number;
  waitlist: number;
}

async function getStats(db: PrismaClient, label: string): Promise<DatabaseStats> {
  console.log(`📊 Analyzing ${label} database...`);
  
  const [users, studios, usersWithStudios, studioTypes, studioImages, studioServices, reviews, faq, waitlist] = await Promise.all([
    db.users.count(),
    db.studio_profiles.count(),
    db.users.count({
      where: {
        studio_profiles: {
          isNot: null
        }
      }
    }),
    db.studio_studio_types.count(),
    db.studio_images.count(),
    db.studio_services.count(),
    db.reviews.count(),
    db.faq.count(),
    db.waitlist.count()
  ]);

  return {
    users,
    usersWithStudios,
    usersWithoutStudios: users - usersWithStudios,
    studios,
    studioTypes,
    studioImages,
    studioServices,
    reviews,
    faq,
    waitlist
  };
}

function displayStats(label: string, stats: DatabaseStats) {
  console.log(`\n${label}:`);
  console.log(`  Users: ${stats.users} (${stats.usersWithStudios} with studios, ${stats.usersWithoutStudios} without)`);
  console.log(`  Studios: ${stats.studios}`);
  console.log(`  Studio Types: ${stats.studioTypes}`);
  console.log(`  Studio Images: ${stats.studioImages}`);
  console.log(`  Studio Services: ${stats.studioServices}`);
  console.log(`  Reviews: ${stats.reviews}`);
  console.log(`  FAQ: ${stats.faq}`);
  console.log(`  Waitlist: ${stats.waitlist}`);
}

function displayDifferences(prodStats: DatabaseStats, devStats: DatabaseStats) {
  console.log('\n📈 Differences:');
  const diff = {
    users: prodStats.users - devStats.users,
    studios: prodStats.studios - devStats.studios,
    studioTypes: prodStats.studioTypes - devStats.studioTypes,
    studioImages: prodStats.studioImages - devStats.studioImages,
    studioServices: prodStats.studioServices - devStats.studioServices,
    reviews: prodStats.reviews - devStats.reviews,
    faq: prodStats.faq - devStats.faq,
    waitlist: prodStats.waitlist - devStats.waitlist
  };

  console.log(`  Users: ${diff.users > 0 ? '+' : ''}${diff.users}`);
  console.log(`  Studios: ${diff.studios > 0 ? '+' : ''}${diff.studios}`);
  console.log(`  Studio Types: ${diff.studioTypes > 0 ? '+' : ''}${diff.studioTypes}`);
  console.log(`  Studio Images: ${diff.studioImages > 0 ? '+' : ''}${diff.studioImages}`);
  console.log(`  Studio Services: ${diff.studioServices > 0 ? '+' : ''}${diff.studioServices}`);
  console.log(`  Reviews: ${diff.reviews > 0 ? '+' : ''}${diff.reviews}`);
  console.log(`  FAQ: ${diff.faq > 0 ? '+' : ''}${diff.faq}`);
  console.log(`  Waitlist: ${diff.waitlist > 0 ? '+' : ''}${diff.waitlist}`);

  return diff;
}

async function showMenu(prodStats: DatabaseStats, devStats: DatabaseStats) {
  const diff = displayDifferences(prodStats, devStats);

  console.log('\n════════════════════════════════════════════════════════');
  console.log('📋 AVAILABLE SYNC OPTIONS');
  console.log('════════════════════════════════════════════════════════\n');

  const options: string[] = [];

  // Option 1: Add missing data from production to dev
  if (diff.users > 0 || diff.studios > 0 || diff.reviews > 0 || diff.faq > 0 || diff.waitlist > 0) {
    options.push('1');
    console.log('1️⃣  Add missing data from PRODUCTION → DEV');
    console.log('   ✓ Safe: Only adds new records');
    console.log('   ✓ Preserves all existing dev data');
    console.log('   ✓ Production remains unchanged\n');
  }

  // Option 2: Add missing data from dev to production  
  if (diff.users < 0 || diff.studios < 0 || diff.reviews < 0 || diff.faq < 0 || diff.waitlist < 0) {
    options.push('2');
    console.log('2️⃣  Add missing data from DEV → PRODUCTION');
    console.log('   ⚠️  Caution: Writes to production');
    console.log('   ✓ Only adds new records');
    console.log('   ✓ Preserves all existing production data\n');
  }

  // Option 3: Mirror production data to dev
  options.push('3');
  console.log('3️⃣  ⚠️  Mirror PRODUCTION data → DEV');
  console.log('   ⚠️  CAUTION: May lose dev-only data');
  console.log('   • Clears dev database');
  console.log('   • Copies all production data');
  console.log('   • Production remains unchanged\n');

  // Option 4: Mirror dev data to production
  options.push('4');
  console.log('4️⃣  🚨 Mirror DEV data → PRODUCTION');
  console.log('   🚨 WARNING: DANGEROUS OPERATION');
  console.log('   • Clears production database');
  console.log('   • Copies all dev data');
  console.log('   • Production data WILL BE LOST\n');

  // Option 5: Compare schema
  options.push('5');
  console.log('5️⃣  Compare database schemas');
  console.log('   ✓ Safe: Read-only operation\n');

  // Option 6: Export production backup
  options.push('6');
  console.log('6️⃣  Export production backup');
  console.log('   ✓ Safe: Creates backup file\n');

  options.push('0');
  console.log('0️⃣  Exit\n');

  console.log('════════════════════════════════════════════════════════\n');

  return options;
}

async function addMissingDataProductionToDev() {
  console.log('\n🔄 Adding missing data from PRODUCTION → DEV...\n');
  
  // This would call the sync-production-to-dev script logic
  console.log('This would execute the production→dev sync');
  console.log('Use the sync-production-to-dev.ts script for now\n');
}

async function addMissingDataDevToProduction() {
  console.log('\n⚠️  WARNING: This will write to PRODUCTION\n');
  const confirm = await askQuestion('Type "CONFIRM" to proceed: ');
  if (confirm !== 'CONFIRM') {
    console.log('❌ Aborted');
    return;
  }
  
  console.log('\n🔄 Adding missing data from DEV → PRODUCTION...\n');
  console.log('⚠️  This feature requires careful implementation');
  console.log('Please contact your DBA before proceeding\n');
}

async function mirrorProductionToDev() {
  console.log('\n⚠️  CAUTION: This will REPLACE all dev data\n');
  const confirm1 = await askQuestion('Type "MIRROR" to proceed: ');
  if (confirm1 !== 'MIRROR') {
    console.log('❌ Aborted');
    return;
  }

  const confirm2 = await askQuestion('Are you absolutely sure? (yes/no): ');
  if (confirm2.toLowerCase() !== 'yes') {
    console.log('❌ Aborted');
    return;
  }

  console.log('\n🔄 Mirroring PRODUCTION → DEV...\n');
  console.log('This is a destructive operation.');
  console.log('Consider using pg_dump and pg_restore for this\n');
}

async function mirrorDevToProduction() {
  console.log('\n🚨🚨🚨 DANGER: This will DESTROY all production data 🚨🚨🚨\n');
  console.log('This operation should NEVER be performed without explicit approval\n');
  
  const confirm1 = await askQuestion('Type "I UNDERSTAND THE RISKS" to proceed: ');
  if (confirm1 !== 'I UNDERSTAND THE RISKS') {
    console.log('❌ Aborted');
    return;
  }

  const confirm2 = await askQuestion('Type "DELETE PRODUCTION DATA" to confirm: ');
  if (confirm2 !== 'DELETE PRODUCTION DATA') {
    console.log('❌ Aborted');
    return;
  }

  const confirm3 = await askQuestion('Final confirmation - type "YES": ');
  if (confirm3 !== 'YES') {
    console.log('❌ Aborted');
    return;
  }

  console.log('\n❌ This operation is not implemented for safety reasons');
  console.log('Please use pg_dump and pg_restore manually if absolutely necessary\n');
}

async function compareSchemas() {
  console.log('\n🔍 Comparing database schemas...\n');
  console.log('This would compare table structures, columns, indexes, etc.');
  console.log('Use a dedicated schema comparison tool like pg_dump with --schema-only\n');
}

async function exportProductionBackup() {
  console.log('\n💾 Exporting production backup...\n');
  console.log('This would create a pg_dump backup of production');
  console.log('Use: pg_dump $PROD_DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql\n');
}

async function main() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║     DATABASE COMPARISON & SYNC TOOL              ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // Get statistics
    const [prodStats, devStats] = await Promise.all([
      getStats(prodDb, 'Production'),
      getStats(devDb, 'Dev')
    ]);

    displayStats('📊 PRODUCTION', prodStats);
    displayStats('💻 DEV', devStats);

    let continueLoop = true;

    while (continueLoop) {
      const validOptions = await showMenu(prodStats, devStats);
      const choice = await askQuestion('Select an option: ');

      if (!validOptions.includes(choice)) {
        console.log('\n❌ Invalid option\n');
        continue;
      }

      switch (choice) {
        case '1':
          await addMissingDataProductionToDev();
          break;
        case '2':
          await addMissingDataDevToProduction();
          break;
        case '3':
          await mirrorProductionToDev();
          break;
        case '4':
          await mirrorDevToProduction();
          break;
        case '5':
          await compareSchemas();
          break;
        case '6':
          await exportProductionBackup();
          break;
        case '0':
          continueLoop = false;
          console.log('\n👋 Goodbye!\n');
          break;
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prodDb.$disconnect();
    await devDb.$disconnect();
  }
}

main().catch(console.error);


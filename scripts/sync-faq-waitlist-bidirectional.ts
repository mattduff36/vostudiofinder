/**
 * BI-DIRECTIONAL FAQ & WAITLIST SYNC
 * 
 * ⚠️⚠️⚠️ CRITICAL WARNING ⚠️⚠️⚠️
 * This script WRITES TO BOTH PRODUCTION AND DEV databases
 * Use with extreme caution!
 * 
 * Purpose: Sync FAQ and Waitlist entries in both directions
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import * as fs from 'fs';

// Check that environment files exist
const devEnvPath = path.resolve(process.cwd(), '.env.local');
const prodEnvPath = path.resolve(process.cwd(), '.env.production');

if (!fs.existsSync(devEnvPath)) {
  console.error('❌ ERROR: .env.local file not found');
  console.error(`Expected location: ${devEnvPath}`);
  process.exit(1);
}

if (!fs.existsSync(prodEnvPath)) {
  console.error('❌ ERROR: .env.production file not found');
  console.error(`Expected location: ${prodEnvPath}`);
  console.error('\nThis file is required to connect to production database.');
  console.error('Create it with: DATABASE_URL=<production-database-url>');
  process.exit(1);
}

// Load dev environment (.env.local)
dotenv.config({ path: devEnvPath });
const DEV_DATABASE_URL = process.env.DATABASE_URL;

// Load production environment (.env.production) - MUST override dev DATABASE_URL
dotenv.config({ path: prodEnvPath, override: true });
const PROD_DATABASE_URL = process.env.DATABASE_URL;

// Validate database URLs
if (!DEV_DATABASE_URL || !PROD_DATABASE_URL) {
  console.error('❌ ERROR: Missing database URLs');
  console.error('DEV_DATABASE_URL:', DEV_DATABASE_URL ? 'Found' : 'Missing');
  console.error('PROD_DATABASE_URL:', PROD_DATABASE_URL ? 'Found' : 'Missing');
  console.error('\nCheck that these files exist:');
  console.error(`  - ${devEnvPath}`);
  console.error(`  - ${prodEnvPath}`);
  process.exit(1);
}

// Critical: Ensure we're not pointing to the same database
if (DEV_DATABASE_URL === PROD_DATABASE_URL) {
  console.error('❌ CRITICAL ERROR: Dev and Production databases are the same!');
  console.error('\nBoth database URLs are identical:');
  console.error(`  ${DEV_DATABASE_URL}`);
  console.error('\nThis usually means:');
  console.error('  1. .env.production file is missing');
  console.error('  2. .env.production has same DATABASE_URL as .env.local');
  console.error('  3. .env.production DATABASE_URL is not set');
  console.error('\n⚠️  Syncing a database with itself would corrupt data!');
  process.exit(1);
}

// Create separate Prisma clients
const prodDb = new PrismaClient({
  datasources: { db: { url: PROD_DATABASE_URL } }
});

const devDb = new PrismaClient({
  datasources: { db: { url: DEV_DATABASE_URL } }
});

// Helper to prompt user for confirmation
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

async function main() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  BI-DIRECTIONAL FAQ & WAITLIST SYNC                       ║');
    console.log('║                                                           ║');
    console.log('║  ⚠️⚠️⚠️  WARNING: PRODUCTION WRITE OPERATION  ⚠️⚠️⚠️      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('This script will:');
    console.log('  1️⃣  Copy missing FAQ entries from PRODUCTION → DEV');
    console.log('  2️⃣  Copy missing FAQ entries from DEV → PRODUCTION');
    console.log('  3️⃣  Copy missing Waitlist entries from PRODUCTION → DEV');
    console.log('  4️⃣  Copy missing Waitlist entries from DEV → PRODUCTION\n');

    console.log('🔴 PRODUCTION DATABASE WILL BE MODIFIED');
    console.log('🔴 This operation cannot be undone\n');

    // Check for --confirm flag to bypass interactive prompts
    const hasConfirmFlag = process.argv.includes('--confirm');

    if (!hasConfirmFlag) {
      // First confirmation
      const confirm1 = await askQuestion('⚠️  Do you understand this will WRITE to PRODUCTION? (yes/no): ');
      if (confirm1.toLowerCase() !== 'yes') {
        console.log('❌ Aborted by user');
        return;
      }

      // Second confirmation - must type exact phrase
      const confirm2 = await askQuestion('⚠️  Type "I CONFIRM PRODUCTION WRITE" to proceed: ');
      if (confirm2 !== 'I CONFIRM PRODUCTION WRITE') {
        console.log('❌ Aborted - confirmation phrase not matched');
        return;
      }
    } else {
      console.log('✓ Running with --confirm flag (skipping interactive prompts)\n');
    }

    console.log('\n📊 Analyzing databases...\n');

    // Get all FAQ entries from both databases
    const [prodFaq, devFaq] = await Promise.all([
      prodDb.faq.findMany({ orderBy: { sort_order: 'asc' } }),
      devDb.faq.findMany({ orderBy: { sort_order: 'asc' } })
    ]);

    const prodFaqIds = new Set(prodFaq.map(f => f.id));
    const devFaqIds = new Set(devFaq.map(f => f.id));

    // Find missing FAQ entries
    const missingInDev = prodFaq.filter(f => !devFaqIds.has(f.id));
    const missingInProd = devFaq.filter(f => !prodFaqIds.has(f.id));

    console.log('📝 FAQ Analysis:');
    console.log(`  Production: ${prodFaq.length} entries`);
    console.log(`  Dev: ${devFaq.length} entries`);
    console.log(`  Missing in Dev: ${missingInDev.length}`);
    console.log(`  Missing in Production: ${missingInProd.length}\n`);

    // Get all Waitlist entries from both databases
    const [prodWaitlist, devWaitlist] = await Promise.all([
      prodDb.waitlist.findMany({ orderBy: { created_at: 'desc' } }),
      devDb.waitlist.findMany({ orderBy: { created_at: 'desc' } })
    ]);

    const prodWaitlistIds = new Set(prodWaitlist.map(w => w.id));
    const devWaitlistIds = new Set(devWaitlist.map(w => w.id));

    // Find missing Waitlist entries
    const waitlistMissingInDev = prodWaitlist.filter(w => !devWaitlistIds.has(w.id));
    const waitlistMissingInProd = devWaitlist.filter(w => !prodWaitlistIds.has(w.id));

    console.log('📋 Waitlist Analysis:');
    console.log(`  Production: ${prodWaitlist.length} entries`);
    console.log(`  Dev: ${devWaitlist.length} entries`);
    console.log(`  Missing in Dev: ${waitlistMissingInDev.length}`);
    console.log(`  Missing in Production: ${waitlistMissingInProd.length}\n`);

    // Calculate total operations
    const totalDevWrites = missingInDev.length + waitlistMissingInDev.length;
    const totalProdWrites = missingInProd.length + waitlistMissingInProd.length;

    if (totalDevWrites === 0 && totalProdWrites === 0) {
      console.log('✅ Both databases are already in sync!');
      console.log('   No changes needed.\n');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('PLANNED OPERATIONS:');
    console.log(`  📤 Dev writes: ${totalDevWrites} (${missingInDev.length} FAQ + ${waitlistMissingInDev.length} Waitlist)`);
    console.log(`  📤 Production writes: ${totalProdWrites} (${missingInProd.length} FAQ + ${waitlistMissingInProd.length} Waitlist)`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Final confirmation before writes (unless --confirm flag is used)
    if (!hasConfirmFlag) {
      const confirm3 = await askQuestion('🚀 Proceed with sync? (yes/no): ');
      if (confirm3.toLowerCase() !== 'yes') {
        console.log('❌ Aborted by user');
        return;
      }
    }

    console.log('\n🔄 Starting sync operations...\n');

    // Track results
    let faqAddedToDev = 0;
    let faqAddedToProd = 0;
    let waitlistAddedToDev = 0;
    let waitlistAddedToProd = 0;

    // === FAQ: Production → Dev ===
    if (missingInDev.length > 0) {
      console.log('📝 Syncing FAQ entries: PRODUCTION → DEV');
      for (const faq of missingInDev) {
        await devDb.faq.create({
          data: {
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            sort_order: faq.sort_order,
            created_at: faq.created_at,
            updated_at: faq.updated_at
          }
        });
        faqAddedToDev++;
        console.log(`  ✓ Added to Dev: "${faq.question.substring(0, 50)}..."`);
      }
    }

    // === FAQ: Dev → Production ===
    if (missingInProd.length > 0) {
      console.log('\n📝 Syncing FAQ entries: DEV → PRODUCTION');
      for (const faq of missingInProd) {
        await prodDb.faq.create({
          data: {
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            sort_order: faq.sort_order,
            created_at: faq.created_at,
            updated_at: faq.updated_at
          }
        });
        faqAddedToProd++;
        console.log(`  ✓ Added to Production: "${faq.question.substring(0, 50)}..."`);
      }
    }

    // === Waitlist: Production → Dev ===
    if (waitlistMissingInDev.length > 0) {
      console.log('\n📋 Syncing Waitlist entries: PRODUCTION → DEV');
      for (const waitlist of waitlistMissingInDev) {
        await devDb.waitlist.create({
          data: {
            id: waitlist.id,
            name: waitlist.name,
            email: waitlist.email,
            created_at: waitlist.created_at
          }
        });
        waitlistAddedToDev++;
        console.log(`  ✓ Added to Dev: ${waitlist.name} (${waitlist.email})`);
      }
    }

    // === Waitlist: Dev → Production ===
    if (waitlistMissingInProd.length > 0) {
      console.log('\n📋 Syncing Waitlist entries: DEV → PRODUCTION');
      for (const waitlist of waitlistMissingInProd) {
        await prodDb.waitlist.create({
          data: {
            id: waitlist.id,
            name: waitlist.name,
            email: waitlist.email,
            created_at: waitlist.created_at
          }
        });
        waitlistAddedToProd++;
        console.log(`  ✓ Added to Production: ${waitlist.name} (${waitlist.email})`);
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SYNC COMPLETE                                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('  📝 FAQ:');
    console.log(`     • Added to Dev: ${faqAddedToDev}`);
    console.log(`     • Added to Production: ${faqAddedToProd}`);
    console.log('  📋 Waitlist:');
    console.log(`     • Added to Dev: ${waitlistAddedToDev}`);
    console.log(`     • Added to Production: ${waitlistAddedToProd}`);
    console.log('\n  ✨ Both databases are now in sync!\n');

  } catch (error) {
    console.error('\n❌ ERROR during sync:', error);
    console.error('\n⚠️  Some data may have been partially synced.');
    console.error('   Run the script again to complete the sync.\n');
    throw error;
  } finally {
    await prodDb.$disconnect();
    await devDb.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


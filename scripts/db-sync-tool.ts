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
import * as fs from 'fs';

const execAsync = promisify(exec);

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
  
  try {
    // Get all production users with studios
    const prodUsers = await prodDb.users.findMany({
      include: {
        studio_profiles: {
          include: {
            studio_studio_types: true,
            studio_images: true,
            studio_services: true,
            reviews: true
          }
        }
      }
    });

    // Get existing dev user IDs and emails
    const devUsers = await devDb.users.findMany({
      select: { id: true, email: true }
    });
    const devUserIds = new Set(devUsers.map(u => u.id));
    const devEmails = new Set(devUsers.map(u => u.email));

    // Build set of all user IDs that will exist in dev after sync
    const allDevUserIds = new Set(devUserIds);
    for (const prodUser of prodUsers) {
      if (!devUserIds.has(prodUser.id) && !devEmails.has(prodUser.email)) {
        allDevUserIds.add(prodUser.id);
      }
    }

    let usersAdded = 0;
    let studiosAdded = 0;
    let skipped = 0;
    let reviewsSkipped = 0;

    console.log('📥 Syncing users and studios...\n');

    for (const prodUser of prodUsers) {
      // Skip if user already exists in dev
      if (devUserIds.has(prodUser.id) || devEmails.has(prodUser.email)) {
        skipped++;
        continue;
      }

      console.log(`Adding: ${prodUser.display_name} (${prodUser.email})`);

      // Copy user and studio in a transaction
      await devDb.$transaction(async (tx) => {
        // Create user
        await tx.users.create({
          data: {
            id: prodUser.id,
            email: prodUser.email,
            username: prodUser.username,
            display_name: prodUser.display_name,
            password: prodUser.password,
            avatar_url: prodUser.avatar_url,
            role: prodUser.role,
            email_verified: prodUser.email_verified,
            reset_token: prodUser.reset_token,
            reset_token_expiry: prodUser.reset_token_expiry,
            verification_token: prodUser.verification_token,
            verification_token_expiry: prodUser.verification_token_expiry,
            deletion_requested_at: prodUser.deletion_requested_at,
            deletion_scheduled_for: prodUser.deletion_scheduled_for,
            deletion_status: prodUser.deletion_status,
            created_at: prodUser.created_at,
            updated_at: prodUser.updated_at
          }
        });
        usersAdded++;

        // Create studio if exists
        if (prodUser.studio_profiles) {
          const studio = prodUser.studio_profiles;
          
          await tx.studio_profiles.create({
            data: {
              id: studio.id,
              user_id: studio.user_id,
              name: studio.name,
              description: studio.description,
              short_about: studio.short_about,
              about: studio.about,
              full_address: studio.full_address,
              abbreviated_address: studio.abbreviated_address,
              city: studio.city,
              location: studio.location,
              latitude: studio.latitude,
              longitude: studio.longitude,
              phone: studio.phone,
              website_url: studio.website_url,
              show_email: studio.show_email,
              show_phone: studio.show_phone,
              show_address: studio.show_address,
              show_directions: studio.show_directions,
              equipment_list: studio.equipment_list,
              services_offered: studio.services_offered,
              home_studio_description: studio.home_studio_description,
              last_name: studio.last_name,
              rate_tier_1: studio.rate_tier_1,
              rate_tier_2: studio.rate_tier_2,
              rate_tier_3: studio.rate_tier_3,
              show_rates: studio.show_rates,
              facebook_url: studio.facebook_url,
              twitter_url: studio.twitter_url,
              x_url: studio.x_url,
              linkedin_url: studio.linkedin_url,
              instagram_url: studio.instagram_url,
              tiktok_url: studio.tiktok_url,
              threads_url: studio.threads_url,
              youtube_url: studio.youtube_url,
              vimeo_url: studio.vimeo_url,
              soundcloud_url: studio.soundcloud_url,
              connection1: studio.connection1,
              connection2: studio.connection2,
              connection3: studio.connection3,
              connection4: studio.connection4,
              connection5: studio.connection5,
              connection6: studio.connection6,
              connection7: studio.connection7,
              connection8: studio.connection8,
              connection9: studio.connection9,
              connection10: studio.connection10,
              connection11: studio.connection11,
              connection12: studio.connection12,
              custom_connection_methods: studio.custom_connection_methods,
              status: studio.status,
              is_premium: studio.is_premium,
              is_verified: studio.is_verified,
              is_profile_visible: studio.is_profile_visible,
              is_featured: studio.is_featured,
              is_spotlight: studio.is_spotlight,
              is_crb_checked: studio.is_crb_checked,
              verification_level: studio.verification_level,
              use_coordinates_for_map: studio.use_coordinates_for_map,
              created_at: studio.created_at,
              updated_at: studio.updated_at
            }
          });

          // Copy studio types
          for (const type of studio.studio_studio_types) {
            await tx.studio_studio_types.create({
              data: {
                id: type.id,
                studio_id: type.studio_id,
                studio_type: type.studio_type
              }
            });
          }

          // Copy studio images
          for (const image of studio.studio_images) {
            await tx.studio_images.create({
              data: {
                id: image.id,
                studio_id: image.studio_id,
                image_url: image.image_url,
                alt_text: image.alt_text,
                sort_order: image.sort_order
              }
            });
          }

          // Copy studio services
          for (const service of studio.studio_services) {
            await tx.studio_services.create({
              data: {
                id: service.id,
                studio_id: service.studio_id,
                service: service.service
              }
            });
          }

          // Copy reviews (only if reviewer and owner exist in dev)
          for (const review of studio.reviews) {
            const reviewerExists = allDevUserIds.has(review.reviewer_id);
            const ownerExists = allDevUserIds.has(review.owner_id);
            
            if (!reviewerExists || !ownerExists) {
              reviewsSkipped++;
              continue;
            }
            
            await tx.reviews.create({
              data: {
                id: review.id,
                studio_id: review.studio_id,
                reviewer_id: review.reviewer_id,
                owner_id: review.owner_id,
                rating: review.rating,
                content: review.content,
                status: review.status,
                is_anonymous: review.is_anonymous,
                created_at: review.created_at,
                updated_at: review.updated_at
              }
            });
          }

          studiosAdded++;
        }
      });
    }

    console.log('\n✅ Sync complete!');
    console.log(`   Users added: ${usersAdded}`);
    console.log(`   Studios added: ${studiosAdded}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    if (reviewsSkipped > 0) {
      console.log(`   ⚠️  Reviews skipped (missing users): ${reviewsSkipped}`);
    }
    console.log('');
  } catch (error) {
    console.error('\n❌ Error during sync:', error);
  }
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
  
  try {
    // Get table names from both databases
    const prodTables = await prodDb.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    const devTables = await devDb.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;

    const prodTableNames = new Set(prodTables.map(t => t.tablename));
    const devTableNames = new Set(devTables.map(t => t.tablename));

    // Find differences
    const onlyInProd = prodTables.filter(t => !devTableNames.has(t.tablename));
    const onlyInDev = devTables.filter(t => !prodTableNames.has(t.tablename));
    const inBoth = prodTables.filter(t => devTableNames.has(t.tablename));

    console.log(`📊 Schema Comparison:`);
    console.log(`   Total tables in production: ${prodTables.length}`);
    console.log(`   Total tables in dev: ${devTables.length}`);
    console.log(`   Tables in both: ${inBoth.length}`);
    
    if (onlyInProd.length > 0) {
      console.log(`\n❌ Tables only in PRODUCTION (${onlyInProd.length}):`);
      onlyInProd.forEach(t => console.log(`   - ${t.tablename}`));
    }
    
    if (onlyInDev.length > 0) {
      console.log(`\n❌ Tables only in DEV (${onlyInDev.length}):`);
      onlyInDev.forEach(t => console.log(`   - ${t.tablename}`));
    }
    
    if (onlyInProd.length === 0 && onlyInDev.length === 0) {
      console.log('\n✅ All tables match between production and dev!');
    }
    
    console.log('\n💡 For detailed column comparison, use:');
    console.log('   pg_dump --schema-only $PROD_URL > prod-schema.sql');
    console.log('   pg_dump --schema-only $DEV_URL > dev-schema.sql');
    console.log('   diff prod-schema.sql dev-schema.sql\n');
  } catch (error) {
    console.error('\n❌ Error comparing schemas:', error);
  }
}

async function exportProductionBackup() {
  console.log('\n💾 Exporting production backup...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
  const filename = `backup-production-${timestamp}.sql`;
  
  console.log(`Creating backup: ${filename}`);
  console.log('This may take a few minutes...\n');
  
  try {
    const command = `pg_dump "${PROD_DATABASE_URL}" > ${filename}`;
    await execAsync(command);
    console.log(`✅ Backup created successfully: ${filename}`);
    console.log(`\nTo restore this backup to dev:`);
    console.log(`   psql "${DEV_DATABASE_URL}" < ${filename}\n`);
  } catch (error) {
    console.error('\n❌ Error creating backup:', error);
    console.log('\n💡 Manual backup command:');
    console.log(`   pg_dump "${PROD_DATABASE_URL}" > ${filename}\n`);
  }
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


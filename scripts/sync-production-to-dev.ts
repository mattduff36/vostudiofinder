/**
 * PRODUCTION → DEV DATA SYNC
 * 
 * ⚠️ CRITICAL: This script ONLY READS from production and WRITES to dev
 * ⚠️ Production database is NEVER modified
 * 
 * Purpose: Sync missing users and studios from production to dev
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
    console.log('\n=== PRODUCTION → DEV DATA SYNC ===\n');
    console.log('⚠️  This script will:');
    console.log('   ✓ READ data from PRODUCTION (no changes)');
    console.log('   ✓ WRITE missing data to DEV');
    console.log('   ✓ Skip existing records in DEV\n');

    // Confirm before proceeding
    const answer = await askQuestion('Do you want to proceed? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Aborted by user');
      return;
    }

    console.log('\n📊 Analyzing databases...\n');

    // Get counts
    const [prodUserCount, devUserCount, prodStudioCount, devStudioCount] = await Promise.all([
      prodDb.users.count(),
      devDb.users.count(),
      prodDb.studio_profiles.count(),
      devDb.studio_profiles.count()
    ]);

    console.log('Production:');
    console.log(`  - Users: ${prodUserCount}`);
    console.log(`  - Studios: ${prodStudioCount}`);
    console.log('\nDev:');
    console.log(`  - Users: ${devUserCount}`);
    console.log(`  - Studios: ${devStudioCount}`);
    console.log('\nDifference:');
    console.log(`  - Users to copy: ${prodUserCount - devUserCount}`);
    console.log(`  - Studios to copy: ${prodStudioCount - devStudioCount}\n`);

    if (prodUserCount <= devUserCount && prodStudioCount <= devStudioCount) {
      console.log('✅ Dev database is up to date!');
      return;
    }

    // Get all production users
    console.log('📥 Fetching production users...');
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

    console.log(`Found ${prodUsers.length} users in production\n`);

    // Get existing dev user IDs and emails
    const devUsers = await devDb.users.findMany({
      select: { id: true, email: true }
    });
    const devUserIds = new Set(devUsers.map(u => u.id));
    const devEmails = new Set(devUsers.map(u => u.email));

    let usersAdded = 0;
    let studiosAdded = 0;
    let skipped = 0;
    let reviewsSkipped = 0;

    // Build set of all user IDs that will exist in dev after sync
    const allDevUserIds = new Set(devUserIds);
    for (const prodUser of prodUsers) {
      if (!devUserIds.has(prodUser.id) && !devEmails.has(prodUser.email)) {
        allDevUserIds.add(prodUser.id);
      }
    }

    console.log('🔄 Syncing data...\n');

    for (const prodUser of prodUsers) {
      // Skip if user already exists in dev (by ID or email)
      if (devUserIds.has(prodUser.id) || devEmails.has(prodUser.email)) {
        skipped++;
        continue;
      }

      console.log(`Adding user: ${prodUser.display_name} (${prodUser.email})`);

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
            last_login: prodUser.last_login,
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
              show_exact_location: studio.show_exact_location,
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
            // Check if reviewer and owner exist in dev (or will exist after this sync)
            const reviewerExists = allDevUserIds.has(review.reviewer_id);
            const ownerExists = allDevUserIds.has(review.owner_id);
            
            if (!reviewerExists || !ownerExists) {
              // Skip this review - foreign key constraint would fail
              reviewsSkipped++;
              console.log(`    ⚠️  Skipped review (missing reviewer: ${!reviewerExists}, missing owner: ${!ownerExists})`);
              continue;
            }
            
            await tx.reviews.create({
              data: {
                id: review.id,
                studio_id: review.studio_id,
                reviewer_id: review.reviewer_id,
                owner_id: review.owner_id, // Required: studio owner who received the review
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
          console.log(`  ✓ Added studio: ${studio.name}`);
        }
      });
    }

    // Sync FAQ entries
    console.log('\n📝 Syncing FAQ entries...');
    const prodFaq = await prodDb.faq.findMany();
    const devFaq = await devDb.faq.findMany({ select: { id: true } });
    const devFaqIds = new Set(devFaq.map(f => f.id));
    
    let faqAdded = 0;
    for (const faqEntry of prodFaq) {
      if (!devFaqIds.has(faqEntry.id)) {
        await devDb.faq.create({
          data: {
            id: faqEntry.id,
            question: faqEntry.question,
            answer: faqEntry.answer,
            sort_order: faqEntry.sort_order,
            created_at: faqEntry.created_at,
            updated_at: faqEntry.updated_at
          }
        });
        faqAdded++;
      }
    }
    console.log(`✓ FAQ entries added: ${faqAdded} (${devFaq.length} already existed)`);

    // Sync Waitlist entries
    console.log('\n📋 Syncing Waitlist entries...');
    const prodWaitlist = await prodDb.waitlist.findMany();
    const devWaitlist = await devDb.waitlist.findMany({ select: { id: true } });
    const devWaitlistIds = new Set(devWaitlist.map(w => w.id));
    
    let waitlistAdded = 0;
    for (const waitlistEntry of prodWaitlist) {
      if (!devWaitlistIds.has(waitlistEntry.id)) {
        await devDb.waitlist.create({
          data: {
            id: waitlistEntry.id,
            name: waitlistEntry.name,
            email: waitlistEntry.email,
            created_at: waitlistEntry.created_at
          }
        });
        waitlistAdded++;
      }
    }
    console.log(`✓ Waitlist entries added: ${waitlistAdded} (${devWaitlist.length} already existed)`);

    console.log('\n✅ Sync complete!');
    console.log(`   Users added: ${usersAdded}`);
    console.log(`   Studios added: ${studiosAdded}`);
    console.log(`   FAQ entries added: ${faqAdded}`);
    console.log(`   Waitlist entries added: ${waitlistAdded}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    if (reviewsSkipped > 0) {
      console.log(`   ⚠️  Reviews skipped (missing users): ${reviewsSkipped}`);
      console.log(`   Note: Reviews skipped because reviewer/owner doesn't exist in dev`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    throw error;
  } finally {
    await prodDb.$disconnect();
    await devDb.$disconnect();
  }
}

main().catch(console.error);


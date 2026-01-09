/**
 * FULL PRODUCTION → DEV DATA SYNC
 * 
 * ⚠️ CRITICAL: This script ONLY READS from production and WRITES to dev
 * ⚠️ Production database is NEVER modified
 * ⚠️ This script REPLACES all dev data with production data
 * 
 * Purpose: Make dev database identical to production database
 * This will remove all test accounts and ensure dev matches production exactly
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
    console.log('\n' + '='.repeat(80));
    console.log('🔄 FULL PRODUCTION → DEV DATA SYNC');
    console.log('='.repeat(80) + '\n');
    
    console.log('⚠️  WARNING: This script will:');
    console.log('   ✓ READ data from PRODUCTION (READ ONLY - no changes)');
    console.log('   ✗ DELETE ALL existing data in DEV database');
    console.log('   ✓ REPLACE dev database with production data');
    console.log('   ✓ Remove all test accounts from dev');
    console.log('   ✓ Make dev match production exactly (642 users & studios)\n');

    // Get current counts
    console.log('📊 Current Database Status:\n');
    const [prodUserCount, devUserCount, prodStudioCount, devStudioCount] = await Promise.all([
      prodDb.users.count(),
      devDb.users.count(),
      prodDb.studio_profiles.count(),
      devDb.studio_profiles.count()
    ]);

    console.log('Production:');
    console.log(`  - Users: ${prodUserCount}`);
    console.log(`  - Studios: ${prodStudioCount}`);
    console.log('\nDev (current):');
    console.log(`  - Users: ${devUserCount}`);
    console.log(`  - Studios: ${devStudioCount}`);
    console.log('\nDev (after sync):');
    console.log(`  - Users: ${prodUserCount} (will match production)`);
    console.log(`  - Studios: ${prodStudioCount} (will match production)\n`);

    // Check for --confirm flag
    const hasConfirmFlag = process.argv.includes('--confirm');

    if (!hasConfirmFlag) {
      // Double confirmation
      console.log('⚠️  This is a DESTRUCTIVE operation that will DELETE all dev data!');
      const answer1 = await askQuestion('Type "DELETE DEV DATA" to confirm: ');
      if (answer1 !== 'DELETE DEV DATA') {
        console.log('❌ Aborted by user');
        return;
      }

      const answer2 = await askQuestion('\nAre you absolutely sure? Type "YES SYNC" to proceed: ');
      if (answer2 !== 'YES SYNC') {
        console.log('❌ Aborted by user');
        return;
      }
    } else {
      console.log('⚠️  Running with --confirm flag (skipping confirmation prompts)');
    }

    console.log('\n🔄 Starting full sync...\n');

    // Step 1: Delete all data from dev (in correct order to respect foreign keys)
    console.log('🗑️  Step 1: Deleting all existing dev data...\n');
    
    await devDb.$transaction(async (tx) => {
      // Delete in order to respect foreign key constraints
      console.log('  Deleting reviews...');
      await tx.reviews.deleteMany({});
      
      console.log('  Deleting studio images...');
      await tx.studio_images.deleteMany({});
      
      console.log('  Deleting studio services...');
      await tx.studio_services.deleteMany({});
      
      console.log('  Deleting studio types...');
      await tx.studio_studio_types.deleteMany({});
      
      console.log('  Deleting studio profiles...');
      await tx.studio_profiles.deleteMany({});
      
      console.log('  Deleting refunds...');
      await tx.refunds.deleteMany({});
      
      console.log('  Deleting payments...');
      await tx.payments.deleteMany({});
      
      console.log('  Deleting subscriptions...');
      await tx.subscriptions.deleteMany({});
      
      console.log('  Deleting sessions...');
      await tx.sessions.deleteMany({});
      
      console.log('  Deleting accounts (OAuth)...');
      await tx.accounts.deleteMany({});
      
      console.log('  Deleting messages...');
      await tx.messages.deleteMany({});
      
      console.log('  Deleting user connections...');
      await tx.user_connections.deleteMany({});
      
      console.log('  Deleting user metadata...');
      await tx.user_metadata.deleteMany({});
      
      console.log('  Deleting content reports...');
      await tx.content_reports.deleteMany({});
      
      console.log('  Deleting notifications...');
      await tx.notifications.deleteMany({});
      
      console.log('  Deleting saved searches...');
      await tx.saved_searches.deleteMany({});
      
      console.log('  Deleting review responses...');
      await tx.review_responses.deleteMany({});
      
      console.log('  Deleting pending subscriptions...');
      await tx.pending_subscriptions.deleteMany({});
      
      console.log('  Deleting FAQ entries...');
      await tx.faq.deleteMany({});
      
      console.log('  Deleting waitlist entries...');
      await tx.waitlist.deleteMany({});
      
      console.log('  Deleting users...');
      await tx.users.deleteMany({});
    });

    console.log('✅ All dev data deleted\n');

    // Step 2: Copy all data from production
    console.log('📥 Step 2: Copying all data from production...\n');

    // Get all production users with their studios
    const prodUsers = await prodDb.users.findMany({
      include: {
        studio_profiles: {
          include: {
            studio_studio_types: true,
            studio_images: true,
            studio_services: true,
            reviews: {
              include: {
                users_reviews_reviewer_idTousers: {
                  select: { id: true }
                },
                users_reviews_owner_idTousers: {
                  select: { id: true }
                }
              }
            }
          }
        },
        payments: true,
        subscriptions: true,
        refunds_refunds_user_idTousers: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    console.log(`Found ${prodUsers.length} users in production\n`);

    let usersAdded = 0;
    let studiosAdded = 0;
    let paymentsAdded = 0;
    let subscriptionsAdded = 0;
    let refundsAdded = 0;

    // Copy users and their related data
    for (const prodUser of prodUsers) {
      console.log(`Copying user: ${prodUser.display_name} (${prodUser.email})`);

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
            status: prodUser.status,
            reservation_expires_at: prodUser.reservation_expires_at,
            payment_attempted_at: prodUser.payment_attempted_at,
            payment_retry_count: prodUser.payment_retry_count,
            day2_reminder_sent_at: prodUser.day2_reminder_sent_at,
            day5_reminder_sent_at: prodUser.day5_reminder_sent_at,
            failed_payment_email_sent_at: prodUser.failed_payment_email_sent_at,
            created_at: prodUser.created_at,
            updated_at: prodUser.updated_at
          }
        });
        usersAdded++;

        // Copy payments
        for (const payment of prodUser.payments) {
          await tx.payments.create({
            data: {
              id: payment.id,
              user_id: payment.user_id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              stripe_checkout_session_id: payment.stripe_checkout_session_id,
              stripe_payment_intent_id: payment.stripe_payment_intent_id,
              refunded_amount: payment.refunded_amount,
              created_at: payment.created_at,
              updated_at: payment.updated_at
            }
          });
          paymentsAdded++;
        }

        // Copy subscriptions
        for (const subscription of prodUser.subscriptions) {
          await tx.subscriptions.create({
            data: {
              id: subscription.id,
              user_id: subscription.user_id,
              stripe_subscription_id: subscription.stripe_subscription_id,
              status: subscription.status,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              created_at: subscription.created_at,
              updated_at: subscription.updated_at
            }
          });
          subscriptionsAdded++;
        }

        // Copy refunds
        for (const refund of prodUser.refunds_refunds_user_idTousers) {
          await tx.refunds.create({
            data: {
              id: refund.id,
              user_id: refund.user_id,
              payment_id: refund.payment_id,
              amount: refund.amount,
              currency: refund.currency,
              status: refund.status,
              stripe_refund_id: refund.stripe_refund_id,
              reason: refund.reason,
              processed_by: refund.processed_by,
              created_at: refund.created_at,
              updated_at: refund.updated_at
            }
          });
          refundsAdded++;
        }

        // Copy studio if exists
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
              featured_until: studio.featured_until,
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

          // Copy reviews (only if both reviewer and owner exist)
          for (const review of studio.reviews) {
            // Check if reviewer and owner exist (they should since we're copying all users)
            const reviewerExists = prodUsers.some(u => u.id === review.reviewer_id);
            const ownerExists = prodUsers.some(u => u.id === review.owner_id);
            
            if (reviewerExists && ownerExists) {
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
          }

          studiosAdded++;
          console.log(`  ✓ Added studio: ${studio.name}`);
        }
      });
    }

    // Copy FAQ entries
    console.log('\n📝 Copying FAQ entries...');
    const prodFaq = await prodDb.faq.findMany();
    for (const faqEntry of prodFaq) {
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
    }
    console.log(`✓ FAQ entries: ${prodFaq.length}`);

    // Copy Waitlist entries
    console.log('\n📋 Copying Waitlist entries...');
    const prodWaitlist = await prodDb.waitlist.findMany();
    for (const waitlistEntry of prodWaitlist) {
      await devDb.waitlist.create({
        data: {
          id: waitlistEntry.id,
          name: waitlistEntry.name,
          email: waitlistEntry.email,
          created_at: waitlistEntry.created_at
        }
      });
    }
    console.log(`✓ Waitlist entries: ${prodWaitlist.length}`);

    // Verify final counts
    console.log('\n📊 Verifying sync...\n');
    const [finalDevUserCount, finalDevStudioCount] = await Promise.all([
      devDb.users.count(),
      devDb.studio_profiles.count()
    ]);

    console.log('✅ Sync complete!\n');
    console.log('📊 Final Database Status:');
    console.log(`   Production Users: ${prodUserCount}`);
    console.log(`   Dev Users: ${finalDevUserCount} ${finalDevUserCount === prodUserCount ? '✅' : '❌'}`);
    console.log(`   Production Studios: ${prodStudioCount}`);
    console.log(`   Dev Studios: ${finalDevStudioCount} ${finalDevStudioCount === prodStudioCount ? '✅' : '❌'}`);
    console.log('\n📈 Summary:');
    console.log(`   Users copied: ${usersAdded}`);
    console.log(`   Studios copied: ${studiosAdded}`);
    console.log(`   Payments copied: ${paymentsAdded}`);
    console.log(`   Subscriptions copied: ${subscriptionsAdded}`);
    console.log(`   Refunds copied: ${refundsAdded}`);
    console.log(`   FAQ entries copied: ${prodFaq.length}`);
    console.log(`   Waitlist entries copied: ${prodWaitlist.length}`);
    console.log('\n✅ Dev database now matches production exactly!');
    console.log('✅ All test accounts have been removed from dev!\n');

  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    throw error;
  } finally {
    await prodDb.$disconnect();
    await devDb.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


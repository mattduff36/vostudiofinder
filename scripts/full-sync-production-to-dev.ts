/**
 * FULL PRODUCTION → DEV DATA SYNC
 * 
 * ⚠️ CRITICAL: This script ONLY READS from production and WRITES to dev
 * ⚠️ Production database is NEVER modified
 * ⚠️ This script REPLACES all dev data with production data
 * 
 * Purpose: Make dev database identical to production database
 * This will remove all test accounts and ensure dev matches production exactly
 * 
 * Updated: 2026-02-07 — includes ALL tables and ALL fields (membership_tier, 
 * show_exact_location, accounts, sessions, messages, user_metadata, etc.)
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
    console.log('   ✓ Copy ALL tables and ALL fields (true mirror)');
    console.log('   ✓ Make dev match production exactly\n');

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

    // =========================================================================
    // Step 1: Delete all data from dev (in correct order for foreign keys)
    // =========================================================================
    console.log('🗑️  Step 1: Deleting all existing dev data...\n');
    
    // Delete in multiple transactions to avoid timeout on large datasets
    // Audit & email tables must be deleted FIRST — they have FK refs to users + studio_profiles
    console.log('  Deleting audit & email tables...');
    await devDb.$transaction([
      // enrichment_suggestions → profile_audit_findings (FK), so delete first
      devDb.profile_enrichment_suggestions.deleteMany({}),
      devDb.profile_audit_log.deleteMany({}),
      devDb.profile_audit_findings.deleteMany({}),
      // email_deliveries → email_campaigns (FK), so delete first
      devDb.email_deliveries.deleteMany({}),
      devDb.email_campaigns.deleteMany({}),
      // email_template_versions → email_templates (FK), so delete first
      devDb.email_template_versions.deleteMany({}),
      devDb.email_templates.deleteMany({}),
      devDb.email_preferences.deleteMany({}),
      devDb.error_log_groups.deleteMany({}),
    ]);
    console.log('  ✓ Audit & email tables cleared');

    // Second: leaf tables (no dependents aside from the above)
    console.log('  Deleting leaf tables...');
    await devDb.$transaction([
      devDb.review_responses.deleteMany({}),
      devDb.saved_searches.deleteMany({}),
      devDb.notifications.deleteMany({}),
      devDb.content_reports.deleteMany({}),
      devDb.user_metadata.deleteMany({}),
      devDb.user_connections.deleteMany({}),
      devDb.messages.deleteMany({}),
      devDb.sessions.deleteMany({}),
      devDb.accounts.deleteMany({}),
      devDb.pending_subscriptions.deleteMany({}),
      devDb.support_tickets.deleteMany({}),
      devDb.studio_images.deleteMany({}),
      devDb.studio_services.deleteMany({}),
      devDb.studio_studio_types.deleteMany({}),
      devDb.reviews.deleteMany({}),
      devDb.stripe_webhook_events.deleteMany({}),
      devDb.admin_sticky_notes.deleteMany({}),
      devDb.rate_limit_events.deleteMany({}),
    ]);
    console.log('  ✓ Leaf tables cleared');

    // Third: mid-level tables
    console.log('  Deleting mid-level tables...');
    await devDb.$transaction([
      devDb.refunds.deleteMany({}),
      devDb.payments.deleteMany({}),
      devDb.subscriptions.deleteMany({}),
      devDb.studio_profiles.deleteMany({}),
    ]);
    console.log('  ✓ Mid-level tables cleared');

    // Fourth: root tables
    console.log('  Deleting root tables...');
    await devDb.$transaction([
      devDb.users.deleteMany({}),
      devDb.faq.deleteMany({}),
      devDb.waitlist.deleteMany({}),
      devDb.contacts.deleteMany({}),
      devDb.poi.deleteMany({}),
      devDb.platform_updates.deleteMany({}),
    ]);
    console.log('  ✓ Root tables cleared');

    console.log('\n✅ All dev data deleted\n');

    // =========================================================================
    // Step 2: Copy all data from production
    // =========================================================================
    console.log('📥 Step 2: Copying all data from production...\n');

    // --- 2a: Users (root entity) ---
    console.log('👤 Copying users...');
    const prodUsers = await prodDb.users.findMany({ orderBy: { created_at: 'asc' } });
    let usersAdded = 0;
    
    for (const u of prodUsers) {
      await devDb.users.create({
        data: {
          id: u.id,
          email: u.email,
          username: u.username,
          display_name: u.display_name,
          password: u.password,
          avatar_url: u.avatar_url,
          role: u.role,
          email_verified: u.email_verified,
          reset_token: u.reset_token,
          reset_token_expiry: u.reset_token_expiry,
          verification_token: u.verification_token,
          verification_token_expiry: u.verification_token_expiry,
          deletion_requested_at: u.deletion_requested_at,
          deletion_scheduled_for: u.deletion_scheduled_for,
          deletion_status: u.deletion_status,
          last_login: u.last_login,
          membership_tier: u.membership_tier,
          status: u.status,
          reservation_expires_at: u.reservation_expires_at,
          payment_attempted_at: u.payment_attempted_at,
          payment_retry_count: u.payment_retry_count,
          day2_reminder_sent_at: u.day2_reminder_sent_at,
          day5_reminder_sent_at: u.day5_reminder_sent_at,
          failed_payment_email_sent_at: u.failed_payment_email_sent_at,
          created_at: u.created_at,
          updated_at: u.updated_at,
        }
      });
      usersAdded++;
    }
    console.log(`  ✓ Users: ${usersAdded}\n`);

    // --- 2b: Accounts (OAuth) ---
    console.log('🔑 Copying accounts (OAuth)...');
    const prodAccounts = await prodDb.accounts.findMany();
    for (const a of prodAccounts) {
      await devDb.accounts.create({
        data: {
          id: a.id,
          user_id: a.user_id,
          type: a.type,
          provider: a.provider,
          provider_account_id: a.provider_account_id,
          refresh_token: a.refresh_token,
          access_token: a.access_token,
          expires_at: a.expires_at,
          token_type: a.token_type,
          scope: a.scope,
          id_token: a.id_token,
          session_state: a.session_state,
        }
      });
    }
    console.log(`  ✓ Accounts: ${prodAccounts.length}`);

    // --- 2c: Sessions ---
    console.log('🔐 Copying sessions...');
    const prodSessions = await prodDb.sessions.findMany();
    for (const s of prodSessions) {
      await devDb.sessions.create({
        data: {
          id: s.id,
          session_token: s.session_token,
          user_id: s.user_id,
          expires: s.expires,
        }
      });
    }
    console.log(`  ✓ Sessions: ${prodSessions.length}`);

    // --- 2d: Studio profiles ---
    console.log('🏠 Copying studio profiles...');
    const prodStudios = await prodDb.$queryRaw<any[]>`
      SELECT * FROM studio_profiles ORDER BY created_at ASC
    `;
    
    // Batch insert in chunks of 50 to avoid timeout
    const chunkSize = 50;
    let studiosAdded = 0;
    
    for (let i = 0; i < prodStudios.length; i += chunkSize) {
      const chunk = prodStudios.slice(i, i + chunkSize);
      const studioDataArray = chunk.map(s => {
        const data: any = {
          id: s.id,
          user_id: s.user_id,
          name: s.name,
          description: s.description,
          short_about: s.short_about,
          about: s.about,
          full_address: s.full_address,
          abbreviated_address: s.abbreviated_address,
          city: s.city,
          location: s.location,
          latitude: s.latitude,
          longitude: s.longitude,
          show_exact_location: s.show_exact_location,
          phone: s.phone,
          website_url: s.website_url,
          show_email: s.show_email,
          show_phone: s.show_phone,
          show_address: s.show_address,
          show_directions: s.show_directions,
          equipment_list: s.equipment_list,
          services_offered: s.services_offered,
          home_studio_description: s.home_studio_description,
          last_name: s.last_name,
          rate_tier_1: s.rate_tier_1,
          rate_tier_2: s.rate_tier_2,
          rate_tier_3: s.rate_tier_3,
          show_rates: s.show_rates,
          facebook_url: s.facebook_url,
          twitter_url: s.twitter_url,
          x_url: s.x_url,
          linkedin_url: s.linkedin_url,
          instagram_url: s.instagram_url,
          tiktok_url: s.tiktok_url,
          threads_url: s.threads_url,
          youtube_url: s.youtube_url,
          vimeo_url: s.vimeo_url,
          soundcloud_url: s.soundcloud_url,
          connection1: s.connection1,
          connection2: s.connection2,
          connection3: s.connection3,
          connection4: s.connection4,
          connection5: s.connection5,
          connection6: s.connection6,
          connection7: s.connection7,
          connection8: s.connection8,
          connection9: s.connection9,
          connection10: s.connection10,
          connection11: s.connection11,
          connection12: s.connection12,
          custom_connection_methods: s.custom_connection_methods || [],
          status: s.status,
          is_premium: s.is_premium,
          is_verified: s.is_verified,
          is_profile_visible: s.is_profile_visible,
          is_featured: s.is_featured,
          featured_until: s.featured_until,
          is_spotlight: s.is_spotlight,
          is_crb_checked: s.is_crb_checked,
          verification_level: s.verification_level,
          use_coordinates_for_map: s.use_coordinates_for_map,
          created_at: s.created_at,
          updated_at: s.updated_at,
        };
        
        // Add new fields if they exist in production data (with defaults if missing)
        data.admin_review = s.admin_review ?? false;
        data.bluesky_url = s.bluesky_url ?? null;
        data.image_rights_confirmed_at = s.image_rights_confirmed_at ?? null;
        data.image_rights_confirmed_text = s.image_rights_confirmed_text ?? null;
        data.image_rights_confirmed_ip = s.image_rights_confirmed_ip ?? null;
        
        return data;
      });
      
      // Use createMany which doesn't enforce relations
      await devDb.studio_profiles.createMany({ data: studioDataArray, skipDuplicates: true });
      studiosAdded += studioDataArray.length;
    }
    console.log(`  ✓ Studios: ${studiosAdded}`);

    // --- 2e: Studio types ---
    console.log('📋 Copying studio types...');
    const prodTypes = await prodDb.studio_studio_types.findMany();
    for (const t of prodTypes) {
      await devDb.studio_studio_types.create({
        data: { id: t.id, studio_id: t.studio_id, studio_type: t.studio_type }
      });
    }
    console.log(`  ✓ Studio types: ${prodTypes.length}`);

    // --- 2f: Studio images ---
    console.log('🖼️  Copying studio images...');
    const prodImages = await prodDb.studio_images.findMany();
    for (const img of prodImages) {
      await devDb.studio_images.create({
        data: { id: img.id, studio_id: img.studio_id, image_url: img.image_url, alt_text: img.alt_text, sort_order: img.sort_order }
      });
    }
    console.log(`  ✓ Studio images: ${prodImages.length}`);

    // --- 2g: Studio services ---
    console.log('⚙️  Copying studio services...');
    const prodServices = await prodDb.studio_services.findMany();
    for (const svc of prodServices) {
      await devDb.studio_services.create({
        data: { id: svc.id, studio_id: svc.studio_id, service: svc.service }
      });
    }
    console.log(`  ✓ Studio services: ${prodServices.length}`);

    // --- 2h: Payments ---
    console.log('💳 Copying payments...');
    const prodPayments = await prodDb.payments.findMany();
    for (const p of prodPayments) {
      await devDb.payments.create({
        data: {
          id: p.id,
          user_id: p.user_id,
          stripe_checkout_session_id: p.stripe_checkout_session_id,
          stripe_payment_intent_id: p.stripe_payment_intent_id,
          stripe_charge_id: p.stripe_charge_id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          refunded_amount: p.refunded_amount,
          metadata: p.metadata,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }
      });
    }
    console.log(`  ✓ Payments: ${prodPayments.length}`);

    // --- 2i: Subscriptions ---
    console.log('📦 Copying subscriptions...');
    const prodSubs = await prodDb.subscriptions.findMany();
    for (const sub of prodSubs) {
      await devDb.subscriptions.create({
        data: {
          id: sub.id,
          user_id: sub.user_id,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_customer_id: sub.stripe_customer_id,
          paypal_subscription_id: sub.paypal_subscription_id,
          payment_method: sub.payment_method,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          cancelled_at: sub.cancelled_at,
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        }
      });
    }
    console.log(`  ✓ Subscriptions: ${prodSubs.length}`);

    // --- 2j: Refunds ---
    console.log('💰 Copying refunds...');
    const prodRefunds = await prodDb.refunds.findMany();
    for (const r of prodRefunds) {
      await devDb.refunds.create({
        data: {
          id: r.id,
          stripe_refund_id: r.stripe_refund_id,
          stripe_payment_intent_id: r.stripe_payment_intent_id,
          amount: r.amount,
          currency: r.currency,
          reason: r.reason,
          comment: r.comment,
          status: r.status,
          processed_by: r.processed_by,
          user_id: r.user_id,
          payment_id: r.payment_id,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }
      });
    }
    console.log(`  ✓ Refunds: ${prodRefunds.length}`);

    // --- 2k: Reviews ---
    console.log('⭐ Copying reviews...');
    const prodReviews = await prodDb.reviews.findMany();
    for (const rev of prodReviews) {
      await devDb.reviews.create({
        data: {
          id: rev.id,
          studio_id: rev.studio_id,
          reviewer_id: rev.reviewer_id,
          owner_id: rev.owner_id,
          rating: rev.rating,
          content: rev.content,
          is_anonymous: rev.is_anonymous,
          status: rev.status,
          created_at: rev.created_at,
          updated_at: rev.updated_at,
        }
      });
    }
    console.log(`  ✓ Reviews: ${prodReviews.length}`);

    // --- 2l: Review responses ---
    console.log('💬 Copying review responses...');
    const prodReviewResponses = await prodDb.review_responses.findMany();
    for (const rr of prodReviewResponses) {
      await devDb.review_responses.create({
        data: {
          id: rr.id,
          review_id: rr.review_id,
          author_id: rr.author_id,
          content: rr.content,
          created_at: rr.created_at,
          updated_at: rr.updated_at,
        }
      });
    }
    console.log(`  ✓ Review responses: ${prodReviewResponses.length}`);

    // --- 2m: Messages ---
    console.log('✉️  Copying messages...');
    const prodMessages = await prodDb.messages.findMany();
    for (const m of prodMessages) {
      await devDb.messages.create({
        data: {
          id: m.id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          subject: m.subject,
          content: m.content,
          is_read: m.is_read,
          created_at: m.created_at,
        }
      });
    }
    console.log(`  ✓ Messages: ${prodMessages.length}`);

    // --- 2n: User connections ---
    console.log('🤝 Copying user connections...');
    const prodConnections = await prodDb.user_connections.findMany();
    for (const uc of prodConnections) {
      await devDb.user_connections.create({
        data: {
          id: uc.id,
          user_id: uc.user_id,
          connected_user_id: uc.connected_user_id,
          accepted: uc.accepted,
          created_at: uc.created_at,
        }
      });
    }
    console.log(`  ✓ User connections: ${prodConnections.length}`);

    // --- 2o: User metadata ---
    console.log('📝 Copying user metadata...');
    const prodMetadata = await prodDb.user_metadata.findMany();
    for (const um of prodMetadata) {
      await devDb.user_metadata.create({
        data: {
          id: um.id,
          user_id: um.user_id,
          key: um.key,
          value: um.value,
          created_at: um.created_at,
          updated_at: um.updated_at,
        }
      });
    }
    console.log(`  ✓ User metadata: ${prodMetadata.length}`);

    // --- 2p: Notifications ---
    console.log('🔔 Copying notifications...');
    const prodNotifications = await prodDb.notifications.findMany();
    for (const n of prodNotifications) {
      await devDb.notifications.create({
        data: {
          id: n.id,
          user_id: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data,
          read: n.read,
          read_at: n.read_at,
          action_url: n.action_url,
          created_at: n.created_at,
          updated_at: n.updated_at,
        }
      });
    }
    console.log(`  ✓ Notifications: ${prodNotifications.length}`);

    // --- 2q: Content reports ---
    console.log('🚩 Copying content reports...');
    const prodReports = await prodDb.content_reports.findMany();
    for (const cr of prodReports) {
      await devDb.content_reports.create({
        data: {
          id: cr.id,
          reporter_id: cr.reporter_id,
          content_type: cr.content_type,
          content_id: cr.content_id,
          reported_user_id: cr.reported_user_id,
          reason: cr.reason,
          custom_reason: cr.custom_reason,
          status: cr.status,
          reviewed_by_id: cr.reviewed_by_id,
          reviewed_at: cr.reviewed_at,
          resolution: cr.resolution,
          created_at: cr.created_at,
          updated_at: cr.updated_at,
        }
      });
    }
    console.log(`  ✓ Content reports: ${prodReports.length}`);

    // --- 2r: Saved searches ---
    console.log('🔍 Copying saved searches...');
    const prodSearches = await prodDb.saved_searches.findMany();
    for (const ss of prodSearches) {
      await devDb.saved_searches.create({
        data: {
          id: ss.id,
          user_id: ss.user_id,
          name: ss.name,
          filters: ss.filters,
          created_at: ss.created_at,
          updated_at: ss.updated_at,
        }
      });
    }
    console.log(`  ✓ Saved searches: ${prodSearches.length}`);

    // --- 2s: Pending subscriptions ---
    console.log('⏳ Copying pending subscriptions...');
    const prodPendingSubs = await prodDb.pending_subscriptions.findMany();
    for (const ps of prodPendingSubs) {
      await devDb.pending_subscriptions.create({
        data: {
          id: ps.id,
          user_id: ps.user_id,
          studio_id: ps.studio_id,
          paypal_subscription_id: ps.paypal_subscription_id,
          stripe_session_id: ps.stripe_session_id,
          status: ps.status,
          payment_method: ps.payment_method,
          created_at: ps.created_at,
          updated_at: ps.updated_at,
        }
      });
    }
    console.log(`  ✓ Pending subscriptions: ${prodPendingSubs.length}`);

    // --- 2t: Support tickets ---
    console.log('🎫 Copying support tickets...');
    const prodTickets = await prodDb.support_tickets.findMany();
    for (const t of prodTickets) {
      await devDb.support_tickets.create({
        data: {
          id: t.id,
          user_id: t.user_id,
          type: t.type,
          category: t.category,
          subject: t.subject,
          message: t.message,
          status: t.status,
          priority: t.priority,
          assigned_to: t.assigned_to,
          resolved_at: t.resolved_at,
          created_at: t.created_at,
          updated_at: t.updated_at,
        }
      });
    }
    console.log(`  ✓ Support tickets: ${prodTickets.length}`);

    // --- 2u: FAQ ---
    console.log('❓ Copying FAQ entries...');
    const prodFaq = await prodDb.faq.findMany();
    for (const f of prodFaq) {
      await devDb.faq.create({
        data: {
          id: f.id,
          question: f.question,
          answer: f.answer,
          sort_order: f.sort_order,
          created_at: f.created_at,
          updated_at: f.updated_at,
        }
      });
    }
    console.log(`  ✓ FAQ entries: ${prodFaq.length}`);

    // --- 2v: Waitlist ---
    console.log('📋 Copying waitlist entries...');
    const prodWaitlist = await prodDb.waitlist.findMany();
    for (const w of prodWaitlist) {
      await devDb.waitlist.create({
        data: {
          id: w.id,
          name: w.name,
          email: w.email,
          type: w.type,
          created_at: w.created_at,
        }
      });
    }
    console.log(`  ✓ Waitlist entries: ${prodWaitlist.length}`);

    // --- 2w: Contacts (legacy) ---
    console.log('📇 Copying contacts...');
    const prodContacts = await prodDb.contacts.findMany();
    for (const c of prodContacts) {
      await devDb.contacts.create({
        data: {
          id: c.id,
          user1: c.user1,
          user2: c.user2,
          accepted: c.accepted,
          created_at: c.created_at,
          updated_at: c.updated_at,
        }
      });
    }
    console.log(`  ✓ Contacts: ${prodContacts.length}`);

    // --- 2x: Stripe webhook events ---
    console.log('🪝 Copying Stripe webhook events...');
    const prodWebhooks = await prodDb.stripe_webhook_events.findMany();
    for (const wh of prodWebhooks) {
      await devDb.stripe_webhook_events.create({
        data: {
          id: wh.id,
          stripe_event_id: wh.stripe_event_id,
          type: wh.type,
          payload: wh.payload,
          processed: wh.processed,
          processed_at: wh.processed_at,
          error: wh.error,
          created_at: wh.created_at,
        }
      });
    }
    console.log(`  ✓ Webhook events: ${prodWebhooks.length}`);

    // --- 2y: Error log groups ---
    console.log('📊 Copying error log groups...');
    const prodErrors = await prodDb.error_log_groups.findMany();
    for (const e of prodErrors) {
      await devDb.error_log_groups.create({
        data: {
          id: e.id,
          sentry_issue_id: e.sentry_issue_id,
          title: e.title,
          level: e.level,
          status: e.status,
          first_seen_at: e.first_seen_at,
          last_seen_at: e.last_seen_at,
          event_count: e.event_count,
          environment: e.environment,
          release: e.release,
          last_event_id: e.last_event_id,
          sample_event_json: e.sample_event_json,
          created_at: e.created_at,
          updated_at: e.updated_at,
        }
      });
    }
    console.log(`  ✓ Error log groups: ${prodErrors.length}`);

    // --- 2z: POI ---
    console.log('📍 Copying POI entries...');
    const prodPoi = await prodDb.poi.findMany();
    for (const p of prodPoi) {
      await devDb.poi.create({
        data: {
          id: p.id,
          name: p.name,
          description: p.description,
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          category: p.category,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }
      });
    }
    console.log(`  ✓ POI entries: ${prodPoi.length}`);

    // --- 2aa: Admin sticky notes ---
    console.log('📌 Copying admin sticky notes...');
    const prodStickyNotes = await prodDb.admin_sticky_notes.findMany();
    for (const sn of prodStickyNotes) {
      await devDb.admin_sticky_notes.create({
        data: {
          id: sn.id,
          key: sn.key,
          content: sn.content,
          created_at: sn.created_at,
          updated_at: sn.updated_at,
        }
      });
    }
    console.log(`  ✓ Admin sticky notes: ${prodStickyNotes.length}`);

    // --- 2ab: Rate limit events ---
    console.log('🚦 Copying rate limit events...');
    const prodRateLimits = await prodDb.rate_limit_events.findMany();
    for (const rl of prodRateLimits) {
      await devDb.rate_limit_events.create({
        data: {
          id: rl.id,
          fingerprint: rl.fingerprint,
          endpoint: rl.endpoint,
          event_count: rl.event_count,
          window_start: rl.window_start,
          last_event_at: rl.last_event_at,
        }
      });
    }
    console.log(`  ✓ Rate limit events: ${prodRateLimits.length}`);

    // --- 2ac: Profile audit findings ---
    console.log('🔍 Copying profile audit findings...');
    let prodAuditFindings: any[] = [];
    try {
      prodAuditFindings = await prodDb.profile_audit_findings.findMany();
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('  ⚠️  Table does not exist in production, skipping...');
        prodAuditFindings = [];
      } else {
        throw error;
      }
    }
    for (const af of prodAuditFindings) {
      await devDb.profile_audit_findings.create({
        data: {
          id: af.id,
          user_id: af.user_id,
          studio_profile_id: af.studio_profile_id,
          classification: af.classification,
          reasons: af.reasons,
          completeness_score: af.completeness_score,
          recommended_action: af.recommended_action,
          metadata: af.metadata,
          created_at: af.created_at,
          updated_at: af.updated_at,
        }
      });
    }
    console.log(`  ✓ Profile audit findings: ${prodAuditFindings.length}`);

    // --- 2ad: Profile enrichment suggestions (FK → profile_audit_findings) ---
    console.log('💡 Copying profile enrichment suggestions...');
    let prodEnrichments: any[] = [];
    try {
      prodEnrichments = await prodDb.profile_enrichment_suggestions.findMany();
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('  ⚠️  Table does not exist in production, skipping...');
        prodEnrichments = [];
      } else {
        throw error;
      }
    }
    for (const es of prodEnrichments) {
      await devDb.profile_enrichment_suggestions.create({
        data: {
          id: es.id,
          audit_finding_id: es.audit_finding_id,
          field_name: es.field_name,
          current_value: es.current_value,
          suggested_value: es.suggested_value,
          confidence: es.confidence,
          evidence_url: es.evidence_url,
          evidence_type: es.evidence_type,
          status: es.status,
          reviewed_by_id: es.reviewed_by_id,
          reviewed_at: es.reviewed_at,
          applied_at: es.applied_at,
          created_at: es.created_at,
          updated_at: es.updated_at,
        }
      });
    }
    console.log(`  ✓ Profile enrichment suggestions: ${prodEnrichments.length}`);

    // --- 2ae: Profile audit log ---
    console.log('📋 Copying profile audit log...');
    let prodAuditLog: any[] = [];
    try {
      prodAuditLog = await prodDb.profile_audit_log.findMany();
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('  ⚠️  Table does not exist in production, skipping...');
        prodAuditLog = [];
      } else {
        throw error;
      }
    }
    for (const al of prodAuditLog) {
      await devDb.profile_audit_log.create({
        data: {
          id: al.id,
          suggestion_id: al.suggestion_id,
          user_id: al.user_id,
          studio_profile_id: al.studio_profile_id,
          action: al.action,
          field_name: al.field_name,
          old_value: al.old_value,
          new_value: al.new_value,
          evidence_url: al.evidence_url,
          performed_by_id: al.performed_by_id,
          notes: al.notes,
          created_at: al.created_at,
        }
      });
    }
    console.log(`  ✓ Profile audit log: ${prodAuditLog.length}`);

    // --- 2af: Email templates (must come before versions & campaigns) ---
    console.log('📧 Copying email templates...');
    const prodEmailTemplates = await prodDb.email_templates.findMany();
    for (const et of prodEmailTemplates) {
      await devDb.email_templates.create({
        data: {
          id: et.id,
          key: et.key,
          name: et.name,
          description: et.description,
          layout: et.layout,
          is_marketing: et.is_marketing,
          is_system: et.is_system,
          from_name: et.from_name,
          from_email: et.from_email,
          reply_to_email: et.reply_to_email,
          subject: et.subject,
          preheader: et.preheader,
          heading: et.heading,
          body_paragraphs: et.body_paragraphs,
          bullet_items: et.bullet_items,
          cta_primary_label: et.cta_primary_label,
          cta_primary_url: et.cta_primary_url,
          cta_secondary_label: et.cta_secondary_label,
          cta_secondary_url: et.cta_secondary_url,
          footer_text: et.footer_text,
          variable_schema: et.variable_schema,
          created_at: et.created_at,
          updated_at: et.updated_at,
          created_by_id: et.created_by_id,
          updated_by_id: et.updated_by_id,
        }
      });
    }
    console.log(`  ✓ Email templates: ${prodEmailTemplates.length}`);

    // --- 2ag: Email template versions (FK → email_templates) ---
    console.log('📝 Copying email template versions...');
    const prodEmailVersions = await prodDb.email_template_versions.findMany();
    for (const ev of prodEmailVersions) {
      await devDb.email_template_versions.create({
        data: {
          id: ev.id,
          template_id: ev.template_id,
          version_number: ev.version_number,
          subject: ev.subject,
          preheader: ev.preheader,
          heading: ev.heading,
          body_paragraphs: ev.body_paragraphs,
          bullet_items: ev.bullet_items,
          cta_primary_label: ev.cta_primary_label,
          cta_primary_url: ev.cta_primary_url,
          cta_secondary_label: ev.cta_secondary_label,
          cta_secondary_url: ev.cta_secondary_url,
          footer_text: ev.footer_text,
          from_name: ev.from_name,
          from_email: ev.from_email,
          reply_to_email: ev.reply_to_email,
          created_at: ev.created_at,
          created_by_id: ev.created_by_id,
        }
      });
    }
    console.log(`  ✓ Email template versions: ${prodEmailVersions.length}`);

    // --- 2ah: Email campaigns (FK → email_templates) ---
    console.log('📨 Copying email campaigns...');
    const prodCampaigns = await prodDb.email_campaigns.findMany();
    for (const ec of prodCampaigns) {
      await devDb.email_campaigns.create({
        data: {
          id: ec.id,
          name: ec.name,
          template_key: ec.template_key,
          status: ec.status,
          filters: ec.filters,
          recipient_count: ec.recipient_count,
          sent_count: ec.sent_count,
          failed_count: ec.failed_count,
          scheduled_at: ec.scheduled_at,
          started_at: ec.started_at,
          completed_at: ec.completed_at,
          created_at: ec.created_at,
          updated_at: ec.updated_at,
          created_by_id: ec.created_by_id,
        }
      });
    }
    console.log(`  ✓ Email campaigns: ${prodCampaigns.length}`);

    // --- 2ai: Email deliveries (FK → email_campaigns) ---
    console.log('📬 Copying email deliveries...');
    const prodDeliveries = await prodDb.email_deliveries.findMany();
    for (const ed of prodDeliveries) {
      await devDb.email_deliveries.create({
        data: {
          id: ed.id,
          campaign_id: ed.campaign_id,
          user_id: ed.user_id,
          to_email: ed.to_email,
          status: ed.status,
          resend_id: ed.resend_id,
          error_message: ed.error_message,
          sent_at: ed.sent_at,
          failed_at: ed.failed_at,
          created_at: ed.created_at,
        }
      });
    }
    console.log(`  ✓ Email deliveries: ${prodDeliveries.length}`);

    // --- 2aj: Email preferences ---
    console.log('⚙️  Copying email preferences...');
    const prodEmailPrefs = await prodDb.email_preferences.findMany();
    for (const ep of prodEmailPrefs) {
      await devDb.email_preferences.create({
        data: {
          id: ep.id,
          user_id: ep.user_id,
          marketing_opt_in: ep.marketing_opt_in,
          unsubscribed_at: ep.unsubscribed_at,
          unsubscribe_token: ep.unsubscribe_token,
          created_at: ep.created_at,
          updated_at: ep.updated_at,
        }
      });
    }
    console.log(`  ✓ Email preferences: ${prodEmailPrefs.length}`);

    // --- 2ak: Platform updates (What's New) ---
    console.log('✨ Copying platform updates (What\'s New)...');
    let prodPlatformUpdates: any[] = [];
    try {
      prodPlatformUpdates = await prodDb.platform_updates.findMany();
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('  ⚠️  Table does not exist in production, skipping...');
        prodPlatformUpdates = [];
      } else {
        throw error;
      }
    }
    for (const pu of prodPlatformUpdates) {
      await devDb.platform_updates.create({
        data: {
          id: pu.id,
          title: pu.title,
          description: pu.description,
          category: pu.category,
          release_date: pu.release_date,
          is_highlighted: pu.is_highlighted,
          created_at: pu.created_at,
          updated_at: pu.updated_at,
        }
      });
    }
    console.log(`  ✓ Platform updates: ${prodPlatformUpdates.length}`);

    // =========================================================================
    // Step 3: Verify final counts
    // =========================================================================
    console.log('\n📊 Verifying sync...\n');
    const [finalDevUserCount, finalDevStudioCount, finalDevPayments, finalDevSubs] = await Promise.all([
      devDb.users.count(),
      devDb.studio_profiles.count(),
      devDb.payments.count(),
      devDb.subscriptions.count(),
    ]);

    console.log('✅ Sync complete!\n');
    console.log('📊 Final Database Comparison:');
    console.log(`   Users:         Prod=${prodUserCount}  Dev=${finalDevUserCount}  ${finalDevUserCount === prodUserCount ? '✅' : '❌'}`);
    console.log(`   Studios:       Prod=${prodStudioCount}  Dev=${finalDevStudioCount}  ${finalDevStudioCount === prodStudioCount ? '✅' : '❌'}`);
    console.log(`   Payments:      ${prodPayments.length} → ${finalDevPayments}`);
    console.log(`   Subscriptions: ${prodSubs.length} → ${finalDevSubs}`);
    console.log(`   Accounts:      ${prodAccounts.length}`);
    console.log(`   Sessions:      ${prodSessions.length}`);
    console.log(`   Messages:      ${prodMessages.length}`);
    console.log(`   Metadata:      ${prodMetadata.length}`);
    console.log(`   Notifications: ${prodNotifications.length}`);
    console.log(`   FAQ:           ${prodFaq.length}`);
    console.log(`   Waitlist:      ${prodWaitlist.length}`);
    console.log(`   Platform upd:  ${prodPlatformUpdates.length}`);
    console.log('\n✅ Dev database now mirrors production exactly!\n');

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

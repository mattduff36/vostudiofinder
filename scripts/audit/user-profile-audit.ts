/**
 * USER PROFILE AUDIT SCRIPT
 * 
 * Audits all users and studio profiles in the development database (cloned from production)
 * Classifies accounts into: JUNK, NEEDS_UPDATE, NOT_ADVERTISING, EXCEPTION, HEALTHY
 * Stores findings in profile_audit_findings table
 * Exports results to JSON and CSV
 * 
 * Usage: ts-node scripts/audit/user-profile-audit.ts [--dry-run] [--export-only]
 */

import { PrismaClient, UserStatus, StudioStatus, AuditClassification } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

// Load dev environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const db = new PrismaClient();

interface AuditResult {
  user_id: string;
  studio_profile_id: string | null;
  classification: AuditClassification;
  reasons: string[];
  completeness_score: number;
  recommended_action: string | null;
  metadata: Record<string, any>;
}

// Classification logic
function classifyAccount(
  user: any,
  studioProfile: any | null,
  relatedData: {
    subscriptions: any[];
    payments: any[];
    pendingSubscriptions: any[];
    messages: any[];
    reviews: any[];
    supportTickets: any[];
  }
): AuditResult {
  const reasons: string[] = [];
  let classification: AuditClassification = 'HEALTHY';
  let recommendedAction: string | null = null;
  const metadata: Record<string, any> = {};

  const now = new Date();
  const accountAge = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
  
  // Check if there's any meaningful activity
  const hasPaymentActivity = relatedData.payments.length > 0 || relatedData.pendingSubscriptions.length > 0;
  const hasSubscription = relatedData.subscriptions.length > 0;
  const hasMessages = relatedData.messages.length > 0;
  const hasReviews = relatedData.reviews.length > 0;
  const hasSupportTickets = relatedData.supportTickets.length > 0;
  const hasActivity = hasPaymentActivity || hasSubscription || hasMessages || hasReviews || hasSupportTickets;

  metadata.account_age_days = accountAge;
  metadata.has_activity = hasActivity;
  metadata.has_studio_profile = !!studioProfile;

  // Rule 1: JUNK - Likely fake/test/abandoned accounts
  if (!studioProfile && (user.status === 'PENDING' || user.status === 'EXPIRED')) {
    if (!hasActivity && accountAge > 30) {
      classification = 'JUNK';
      reasons.push('No studio profile, account status is PENDING/EXPIRED, no activity for 30+ days');
      recommendedAction = 'Consider deletion after manual review';
    } else if (!hasActivity && accountAge > 7) {
      classification = 'JUNK';
      reasons.push('No studio profile, account status is PENDING/EXPIRED, no activity for 7+ days');
      recommendedAction = 'Flag for review';
    }
  }

  // Check for placeholder/test data patterns
  if (user.display_name?.toLowerCase().includes('test') || 
      user.username?.toLowerCase().includes('test') ||
      user.email?.includes('test@') ||
      user.email?.includes('@test.')) {
    reasons.push('Potential test account (name/email contains "test")');
    if (classification === 'HEALTHY') {
      classification = 'JUNK';
      recommendedAction = 'Manual review - possible test account';
    }
  }

  // Check for nonsense usernames/names
  if (user.username?.length < 3 || user.display_name?.length < 2) {
    reasons.push('Unusually short username or display name');
    metadata.suspicious_name = true;
  }

  // Rule 2: NOT_ADVERTISING - Users without intent to list a studio
  if (!studioProfile && classification === 'HEALTHY') {
    if (user.status === 'ACTIVE' && !hasSubscription) {
      classification = 'NOT_ADVERTISING';
      reasons.push('Active user account with no studio profile and no subscription');
      recommendedAction = 'Potential client/browser - no action needed';
    }
  }

  // Rule 3: NOT_ADVERTISING - Studio profile but not visible/active
  if (studioProfile) {
    if (studioProfile.status === 'DRAFT' || studioProfile.status === 'INACTIVE') {
      if (!studioProfile.is_profile_visible && !hasSubscription) {
        classification = 'NOT_ADVERTISING';
        reasons.push(`Studio profile exists but status is ${studioProfile.status} and not visible`);
        recommendedAction = 'Profile exists but not actively advertising';
      }
    }
  }

  // Rule 4: NEEDS_UPDATE - Real studios with incomplete/outdated data
  if (studioProfile && classification === 'HEALTHY') {
    const missingFields: string[] = [];
    
    // Check key listing fields
    if (!studioProfile.city || studioProfile.city === '') missingFields.push('city');
    if (!studioProfile.latitude || !studioProfile.longitude) missingFields.push('coordinates');
    if (!studioProfile.about && !studioProfile.short_about) missingFields.push('about/description');
    if (!studioProfile.phone) missingFields.push('phone');
    if (!studioProfile.website_url) missingFields.push('website');
    
    // Check for any contact/social links
    const hasSocialLinks = !!(
      studioProfile.facebook_url ||
      studioProfile.twitter_url ||
      studioProfile.x_url ||
      studioProfile.linkedin_url ||
      studioProfile.instagram_url ||
      studioProfile.youtube_url ||
      studioProfile.vimeo_url ||
      studioProfile.soundcloud_url
    );
    
    if (!hasSocialLinks) missingFields.push('social_links');

    // Check studio types and services
    if (!studioProfile.studio_studio_types || studioProfile.studio_studio_types.length === 0) {
      missingFields.push('studio_types');
    }
    
    if (!studioProfile.studio_services || studioProfile.studio_services.length === 0) {
      missingFields.push('services');
    }

    if (missingFields.length > 0) {
      classification = 'NEEDS_UPDATE';
      reasons.push(`Missing key fields: ${missingFields.join(', ')}`);
      recommendedAction = 'Enrich profile with missing data';
      metadata.missing_fields = missingFields;
    }

    // Check for stale data (not updated in 1+ year)
    const daysSinceUpdate = Math.floor((now.getTime() - new Date(studioProfile.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate > 365) {
      if (classification === 'HEALTHY') classification = 'NEEDS_UPDATE';
      reasons.push(`Profile not updated in ${Math.floor(daysSinceUpdate / 365)} year(s)`);
      recommendedAction = 'Verify and update stale information';
      metadata.days_since_update = daysSinceUpdate;
    }

    // Check for broken/unnormalized URLs
    const urlFields = [
      { field: 'website_url', value: studioProfile.website_url },
      { field: 'facebook_url', value: studioProfile.facebook_url },
      { field: 'twitter_url', value: studioProfile.twitter_url },
      { field: 'linkedin_url', value: studioProfile.linkedin_url },
      { field: 'instagram_url', value: studioProfile.instagram_url },
      { field: 'youtube_url', value: studioProfile.youtube_url },
      { field: 'vimeo_url', value: studioProfile.vimeo_url },
      { field: 'soundcloud_url', value: studioProfile.soundcloud_url },
    ];

    const urlIssues: string[] = [];
    urlFields.forEach(({ field, value }) => {
      if (value) {
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          urlIssues.push(`${field}: missing scheme`);
        }
      }
    });

    // Check for twitter_url that should be x_url
    if (studioProfile.twitter_url && studioProfile.twitter_url.includes('twitter.com')) {
      urlIssues.push('twitter_url should be migrated to x_url');
    }

    if (urlIssues.length > 0) {
      if (classification === 'HEALTHY') classification = 'NEEDS_UPDATE';
      reasons.push(`URL issues: ${urlIssues.join(', ')}`);
      metadata.url_issues = urlIssues;
    }
  }

  // Rule 5: EXCEPTION - Inconsistent/suspicious data
  
  // Payment/subscription without studio profile
  if (!studioProfile && (hasSubscription || hasPaymentActivity)) {
    classification = 'EXCEPTION';
    reasons.push('Has payment/subscription records but no studio profile');
    recommendedAction = 'Manual review - payment without studio';
    metadata.has_subscription = hasSubscription;
    metadata.has_payment_activity = hasPaymentActivity;
  }

  // Deletion requested but still active
  if (user.deletion_requested_at && user.deletion_status === 'ACTIVE') {
    classification = 'EXCEPTION';
    reasons.push('Deletion requested but account still active');
    recommendedAction = 'Complete or cancel deletion request';
    metadata.deletion_requested_at = user.deletion_requested_at;
  }

  // Geodata inconsistency
  if (studioProfile) {
    const hasCoords = !!(studioProfile.latitude && studioProfile.longitude);
    const hasCity = !!(studioProfile.city && studioProfile.city !== '');
    const hasAddress = !!(studioProfile.full_address || studioProfile.abbreviated_address);

    if (hasCoords && !hasCity) {
      if (classification === 'HEALTHY' || classification === 'NEEDS_UPDATE') {
        classification = 'EXCEPTION';
      }
      reasons.push('Has coordinates but missing city');
      recommendedAction = 'Reverse geocode coordinates to fill city';
      metadata.geodata_issue = 'coords_no_city';
    }

    if (hasCity && !hasCoords && hasAddress) {
      if (classification === 'HEALTHY' || classification === 'NEEDS_UPDATE') {
        classification = 'EXCEPTION';
      }
      reasons.push('Has city/address but missing coordinates');
      recommendedAction = 'Geocode address to get coordinates';
      metadata.geodata_issue = 'address_no_coords';
    }
  }

  // Calculate completeness score
  const completenessScore = calculateCompletenessScore(user, studioProfile);

  return {
    user_id: user.id,
    studio_profile_id: studioProfile?.id || null,
    classification,
    reasons,
    completeness_score: completenessScore,
    recommended_action: recommendedAction,
    metadata,
  };
}

function calculateCompletenessScore(user: any, studioProfile: any | null): number {
  if (!studioProfile) {
    // User-only accounts get a base score
    let score = 0;
    if (user.email) score += 10;
    if (user.username) score += 10;
    if (user.display_name) score += 10;
    if (user.avatar_url) score += 10;
    if (user.email_verified) score += 10;
    return score; // Max 50 for non-studio accounts
  }

  // Studio profile completeness (out of 100)
  let score = 0;
  const weights = {
    // Essential (60 points total)
    name: 10,
    city: 10,
    coordinates: 10,
    about: 10,
    studio_types: 10,
    services: 10,

    // Important (25 points total)
    phone: 5,
    website: 5,
    images: 5,
    equipment: 5,
    social_links: 5,

    // Nice to have (15 points total)
    rates: 5,
    connections: 5,
    user_avatar: 5,
  };

  // Essential fields
  if (studioProfile.name) score += weights.name;
  if (studioProfile.city && studioProfile.city !== '') score += weights.city;
  if (studioProfile.latitude && studioProfile.longitude) score += weights.coordinates;
  if (studioProfile.about || studioProfile.short_about) score += weights.about;
  if (studioProfile.studio_studio_types && studioProfile.studio_studio_types.length > 0) score += weights.studio_types;
  if (studioProfile.studio_services && studioProfile.studio_services.length > 0) score += weights.services;

  // Important fields
  if (studioProfile.phone) score += weights.phone;
  if (studioProfile.website_url) score += weights.website;
  if (studioProfile.studio_images && studioProfile.studio_images.length > 0) score += weights.images;
  if (studioProfile.equipment_list) score += weights.equipment;

  // Social links (any)
  const hasSocial = !!(
    studioProfile.facebook_url ||
    studioProfile.twitter_url ||
    studioProfile.x_url ||
    studioProfile.linkedin_url ||
    studioProfile.instagram_url ||
    studioProfile.youtube_url ||
    studioProfile.vimeo_url ||
    studioProfile.soundcloud_url
  );
  if (hasSocial) score += weights.social_links;

  // Nice to have
  if (studioProfile.rate_tier_1 || studioProfile.rate_tier_2 || studioProfile.rate_tier_3) score += weights.rates;
  
  // Connection methods
  const hasConnections = !!(
    studioProfile.connection1 ||
    studioProfile.connection2 ||
    studioProfile.connection3 ||
    studioProfile.connection4 ||
    studioProfile.connection5
  );
  if (hasConnections) score += weights.connections;

  if (user.avatar_url) score += weights.user_avatar;

  return Math.min(100, score);
}

async function runAudit(options: { dryRun?: boolean; exportOnly?: boolean } = {}) {
  console.log('🔍 Starting User Profile Audit...\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No database writes will be performed\n');
  }

  if (options.exportOnly) {
    console.log('📤 EXPORT ONLY MODE - Using existing findings from database\n');
  }

  try {
    let auditResults: AuditResult[] = [];

    if (!options.exportOnly) {
      // Fetch all users with related data
      console.log('📊 Fetching all users and studio profiles...');
      
      const users = await db.users.findMany({
        include: {
          studio_profiles: {
            include: {
              studio_studio_types: {
                select: { studio_type: true }
              },
              studio_services: {
                select: { service: true }
              },
              studio_images: {
                select: { id: true }
              }
            }
          },
          subscriptions: {
            select: {
              id: true,
              status: true,
              current_period_end: true,
            },
            orderBy: { created_at: 'desc' }
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
            }
          },
          pending_subscriptions: {
            select: {
              id: true,
              status: true,
            }
          },
          messages_messages_sender_idTousers: {
            select: { id: true },
            take: 1,
          },
          reviews_reviews_reviewer_idTousers: {
            select: { id: true },
            take: 1,
          },
          support_tickets: {
            select: { id: true },
            take: 1,
          }
        }
      });

      console.log(`✅ Found ${users.length} users\n`);
      console.log('🔍 Classifying accounts...');

      // Classify each user
      auditResults = users.map(user => {
        const relatedData = {
          subscriptions: user.subscriptions,
          payments: user.payments,
          pendingSubscriptions: user.pending_subscriptions,
          messages: user.messages_messages_sender_idTousers,
          reviews: user.reviews_reviews_reviewer_idTousers,
          supportTickets: user.support_tickets,
        };

        return classifyAccount(user, user.studio_profiles, relatedData);
      });

      console.log(`✅ Classified ${auditResults.length} accounts\n`);

      // Print summary by classification
      const summary = auditResults.reduce((acc, result) => {
        acc[result.classification] = (acc[result.classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📊 Classification Summary:');
      console.log(`  - HEALTHY: ${summary.HEALTHY || 0}`);
      console.log(`  - NEEDS_UPDATE: ${summary.NEEDS_UPDATE || 0}`);
      console.log(`  - NOT_ADVERTISING: ${summary.NOT_ADVERTISING || 0}`);
      console.log(`  - JUNK: ${summary.JUNK || 0}`);
      console.log(`  - EXCEPTION: ${summary.EXCEPTION || 0}`);
      console.log('');

      // Store findings in database
      if (!options.dryRun) {
        console.log('💾 Storing audit findings in database...');
        
        // Clear old findings first
        await db.profile_audit_findings.deleteMany({});

        // Insert new findings
        for (const result of auditResults) {
          await db.profile_audit_findings.create({
            data: {
              id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              user_id: result.user_id,
              studio_profile_id: result.studio_profile_id,
              classification: result.classification,
              reasons: result.reasons,
              completeness_score: result.completeness_score,
              recommended_action: result.recommended_action,
              metadata: result.metadata,
              updated_at: new Date(),
            }
          });
        }

        console.log(`✅ Stored ${auditResults.length} audit findings\n`);
      }
    } else {
      // Export only mode - fetch from database
      console.log('📊 Fetching existing audit findings from database...');
      
      const findings = await db.profile_audit_findings.findMany({
        orderBy: { created_at: 'desc' }
      });

      auditResults = findings.map(f => ({
        user_id: f.user_id,
        studio_profile_id: f.studio_profile_id,
        classification: f.classification,
        reasons: f.reasons as string[],
        completeness_score: f.completeness_score,
        recommended_action: f.recommended_action,
        metadata: f.metadata as Record<string, any>,
      }));

      console.log(`✅ Found ${auditResults.length} existing findings\n`);
    }

    // Export to JSON
    const outputDir = path.resolve(process.cwd(), 'scripts/audit/output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const jsonPath = path.join(outputDir, `audit-results-${timestamp}.json`);
    const csvPath = path.join(outputDir, `audit-results-${timestamp}.csv`);

    console.log('📤 Exporting results...');

    // Export JSON
    fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2));
    console.log(`✅ JSON exported to: ${jsonPath}`);

    // Export CSV
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'user_id', title: 'User ID' },
        { id: 'studio_profile_id', title: 'Studio Profile ID' },
        { id: 'classification', title: 'Classification' },
        { id: 'completeness_score', title: 'Completeness Score' },
        { id: 'reasons', title: 'Reasons' },
        { id: 'recommended_action', title: 'Recommended Action' },
        { id: 'metadata', title: 'Metadata' },
      ]
    });

    await csvWriter.writeRecords(auditResults.map(r => ({
      ...r,
      reasons: r.reasons.join('; '),
      metadata: JSON.stringify(r.metadata),
    })));

    console.log(`✅ CSV exported to: ${csvPath}`);
    console.log('\n✨ Audit complete!');

  } catch (error) {
    console.error('❌ Error during audit:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  exportOnly: args.includes('--export-only'),
};

// Run the audit
runAudit(options).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

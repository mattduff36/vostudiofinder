/**
 * REACTIVATE LEGACY PROFILES
 * 
 * ⚠️ WRITES TO PRODUCTION DATABASE
 * 
 * Purpose: 
 * - Reactivate profiles that were automatically deactivated but have NO expiry date (legacy profiles)
 * - List profiles that were deactivated with expired dates for manual review
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.production directly
const envPath = path.join(process.cwd(), '.env.production');
const envContent = fs.readFileSync(envPath, 'utf-8');
const databaseUrl = envContent
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='))
  ?.split('=')[1]
  .trim();

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in .env.production');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: ['error', 'warn'],
});

async function reactivateLegacyProfiles() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║      REACTIVATING LEGACY PROFILES                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to production database\n');

    // Find profiles deactivated on Jan 28, 2026
    const deactivationDate = new Date('2026-01-28T23:44:00Z');
    const deactivationDateEnd = new Date('2026-01-28T23:45:00Z');

    console.log('🔍 Finding profiles deactivated on Jan 28, 2026...\n');

    const deactivatedProfiles = await prisma.studio_profiles.findMany({
      where: {
        status: 'INACTIVE',
        updated_at: {
          gte: deactivationDate,
          lte: deactivationDateEnd,
        },
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            subscriptions: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                id: true,
                status: true,
                current_period_end: true,
                created_at: true,
              },
            },
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    console.log(`   Found ${deactivatedProfiles.length} profiles deactivated on Jan 28\n`);

    if (deactivatedProfiles.length === 0) {
      console.log('   No profiles found to process.\n');
      await prisma.$disconnect();
      return;
    }

    // Separate into legacy (no expiry) and expired (has expiry date)
    const legacyProfiles: typeof deactivatedProfiles = [];
    const expiredProfiles: typeof deactivatedProfiles = [];

    deactivatedProfiles.forEach((profile) => {
      const latestSub = profile.users.subscriptions?.[0];
      
      // Legacy: No subscription OR subscription with no current_period_end
      if (!latestSub || !latestSub.current_period_end) {
        legacyProfiles.push(profile);
      } else {
        // Has expiry date - check if expired
        const now = new Date();
        if (latestSub.current_period_end < now) {
          expiredProfiles.push(profile);
        } else {
          // Has expiry date but not expired yet - this shouldn't happen, but treat as legacy
          console.log(`   ⚠️  Warning: ${profile.name} has future expiry date but was deactivated`);
          legacyProfiles.push(profile);
        }
      }
    });

    console.log('📊 ANALYSIS:');
    console.log('─'.repeat(60));
    console.log(`   Legacy profiles (no expiry):     ${legacyProfiles.length}`);
    console.log(`   Expired profiles (has expiry):    ${expiredProfiles.length}`);
    console.log('');

    // ============================================
    // REACTIVATE LEGACY PROFILES
    // ============================================
    if (legacyProfiles.length > 0) {
      console.log('🔄 REACTIVATING LEGACY PROFILES:');
      console.log('─'.repeat(60));

      const profileIds = legacyProfiles.map(p => p.id);
      
      const result = await prisma.studio_profiles.updateMany({
        where: {
          id: { in: profileIds },
        },
        data: {
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });

      console.log(`   ✅ Reactivated ${result.count} legacy profiles\n`);

      console.log('   Reactivated profiles:');
      legacyProfiles.forEach((profile) => {
        const latestSub = profile.users.subscriptions?.[0];
        const subStatus = latestSub ? `Subscription ID: ${latestSub.id}, Status: ${latestSub.status}` : 'No subscription';
        console.log(`   • ${profile.name} (${profile.users.username})`);
        console.log(`     ${profile.users.email}`);
        console.log(`     ${subStatus}`);
        console.log('');
      });
    } else {
      console.log('   No legacy profiles to reactivate\n');
    }

    // ============================================
    // LIST EXPIRED PROFILES FOR MANUAL REVIEW
    // ============================================
    if (expiredProfiles.length > 0) {
      console.log('📋 EXPIRED PROFILES FOR MANUAL REVIEW:');
      console.log('─'.repeat(60));
      console.log(`   Found ${expiredProfiles.length} profiles with expired subscriptions\n`);

      expiredProfiles.forEach((profile) => {
        const latestSub = profile.users.subscriptions?.[0];
        const expiredDate = latestSub?.current_period_end;
        const now = new Date();
        const daysExpired = expiredDate 
          ? Math.ceil((now.getTime() - expiredDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        console.log(`   • ${profile.name}`);
        console.log(`     Username: ${profile.users.username}`);
        console.log(`     Email: ${profile.users.email}`);
        console.log(`     Subscription Status: ${latestSub?.status || 'N/A'}`);
        if (expiredDate) {
          console.log(`     Expired: ${expiredDate.toISOString().split('T')[0]} (${daysExpired} days ago)`);
        }
        console.log(`     Profile ID: ${profile.id}`);
        console.log(`     User ID: ${profile.users.id}`);
        console.log('');
      });

      console.log('\n💡 These profiles have expired subscriptions and need manual review.');
      console.log('   They will remain INACTIVE until you decide to reactivate them.\n');
    } else {
      console.log('   No expired profiles found\n');
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Reactivated: ${legacyProfiles.length} legacy profiles (no expiry date)`);
    console.log(`📋 For Review: ${expiredProfiles.length} profiles with expired subscriptions`);
    console.log('');

    // Verify current counts
    const activeCount = await prisma.studio_profiles.count({
      where: {
        status: 'ACTIVE',
        is_profile_visible: true,
      },
    });

    console.log(`📊 Current Active Profiles (ACTIVE + VISIBLE): ${activeCount}`);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ ERROR\n');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

reactivateLegacyProfiles().catch(console.error);

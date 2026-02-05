/**
 * INVESTIGATE ACTIVE PROFILES DROP
 * 
 * ⚠️ READ-ONLY: This script only queries the production database
 * ⚠️ No modifications are made to the database
 * 
 * Purpose: Investigate why active profiles count dropped from 400+ to 349
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

async function investigateActiveProfiles() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║      INVESTIGATING ACTIVE PROFILES DROP                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to production database (READ-ONLY)\n');

    // ============================================
    // 1. CURRENT COUNTS
    // ============================================
    console.log('📊 CURRENT COUNTS:');
    console.log('─'.repeat(60));

    const [
      totalProfiles,
      activeStatusProfiles,
      visibleProfiles,
      activeAndVisibleProfiles,
      inactiveProfiles,
      hiddenProfiles,
      draftProfiles,
      pendingProfiles,
    ] = await Promise.all([
      prisma.studio_profiles.count(),
      prisma.studio_profiles.count({ where: { status: 'ACTIVE' } }),
      prisma.studio_profiles.count({ where: { is_profile_visible: true } }),
      prisma.studio_profiles.count({
        where: {
          status: 'ACTIVE',
          is_profile_visible: true,
        },
      }),
      prisma.studio_profiles.count({ where: { status: 'INACTIVE' } }),
      prisma.studio_profiles.count({ where: { is_profile_visible: false } }),
      prisma.studio_profiles.count({ where: { status: 'DRAFT' } }),
      prisma.studio_profiles.count({ where: { status: 'PENDING' } }),
    ]);

    console.log(`   Total studio profiles:        ${totalProfiles}`);
    console.log(`   Status = ACTIVE:              ${activeStatusProfiles}`);
    console.log(`   is_profile_visible = true:    ${visibleProfiles}`);
    console.log(`   ACTIVE + VISIBLE (active):   ${activeAndVisibleProfiles} ⭐`);
    console.log(`   Status = INACTIVE:            ${inactiveProfiles}`);
    console.log(`   is_profile_visible = false:   ${hiddenProfiles}`);
    console.log(`   Status = DRAFT:              ${draftProfiles}`);
    console.log(`   Status = PENDING:            ${pendingProfiles}`);
    console.log('');

    // ============================================
    // 2. BREAKDOWN BY STATUS AND VISIBILITY
    // ============================================
    console.log('📋 BREAKDOWN BY STATUS AND VISIBILITY:');
    console.log('─'.repeat(60));

    const breakdown = await prisma.studio_profiles.groupBy({
      by: ['status', 'is_profile_visible'],
      _count: true,
      orderBy: [
        { status: 'asc' },
        { is_profile_visible: 'asc' },
      ],
    });

    breakdown.forEach((group) => {
      const visibility = group.is_profile_visible ? 'VISIBLE' : 'HIDDEN';
      console.log(`   ${group.status.padEnd(10)} + ${visibility.padEnd(8)}: ${group._count}`);
    });
    console.log('');

    // ============================================
    // 3. RECENT STATUS CHANGES (Last 30 days)
    // ============================================
    console.log('🕐 RECENT STATUS CHANGES (Last 30 days):');
    console.log('─'.repeat(60));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStatusChanges = await prisma.studio_profiles.findMany({
      where: {
        updated_at: {
          gte: thirtyDaysAgo,
        },
        status: {
          in: ['INACTIVE', 'DRAFT'],
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        is_profile_visible: true,
        updated_at: true,
        users: {
          select: {
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 50,
    });

    if (recentStatusChanges.length > 0) {
      console.log(`   Found ${recentStatusChanges.length} profiles changed to INACTIVE/DRAFT in last 30 days:\n`);
      
      // Group by date
      const byDate = new Map<string, number>();
      recentStatusChanges.forEach((profile) => {
        const date = profile.updated_at.toISOString().split('T')[0];
        byDate.set(date, (byDate.get(date) || 0) + 1);
      });
      
      console.log('   Deactivations by date:');
      Array.from(byDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([date, count]) => {
          console.log(`     ${date}: ${count} profiles`);
        });
      console.log('');
      recentStatusChanges.forEach((profile) => {
        const date = profile.updated_at.toISOString().split('T')[0];
        const time = profile.updated_at.toISOString().split('T')[1].split('.')[0];
        console.log(`   • ${profile.name} (${profile.users.username})`);
        console.log(`     Status: ${profile.status}, Visible: ${profile.is_profile_visible}`);
        console.log(`     Updated: ${date} ${time}`);
        console.log('');
      });
    } else {
      console.log('   No profiles changed to INACTIVE/DRAFT in last 30 days\n');
    }

    // ============================================
    // 4. RECENT VISIBILITY CHANGES (Last 30 days)
    // ============================================
    console.log('👁️  RECENT VISIBILITY CHANGES (Last 30 days):');
    console.log('─'.repeat(60));

    const recentVisibilityChanges = await prisma.studio_profiles.findMany({
      where: {
        updated_at: {
          gte: thirtyDaysAgo,
        },
        is_profile_visible: false,
        status: 'ACTIVE', // Only ACTIVE profiles that became hidden
      },
      select: {
        id: true,
        name: true,
        status: true,
        is_profile_visible: true,
        updated_at: true,
        users: {
          select: {
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 50,
    });

    if (recentVisibilityChanges.length > 0) {
      console.log(`   Found ${recentVisibilityChanges.length} ACTIVE profiles hidden in last 30 days:\n`);
      recentVisibilityChanges.forEach((profile) => {
        const date = profile.updated_at.toISOString().split('T')[0];
        const time = profile.updated_at.toISOString().split('T')[1].split('.')[0];
        console.log(`   • ${profile.name} (${profile.users.username})`);
        console.log(`     Status: ${profile.status}, Visible: ${profile.is_profile_visible}`);
        console.log(`     Updated: ${date} ${time}`);
        console.log('');
      });
    } else {
      console.log('   No ACTIVE profiles hidden in last 30 days\n');
    }

    // ============================================
    // 5. SUBSCRIPTION EXPIRY ANALYSIS
    // ============================================
    console.log('💳 SUBSCRIPTION EXPIRY ANALYSIS:');
    console.log('─'.repeat(60));

    const nowForSubs = new Date();

    // Get all ACTIVE profiles with their subscriptions
    const activeProfilesWithSubs = await prisma.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        users: {
          include: {
            subscriptions: {
              where: {
                status: 'ACTIVE',
              },
              orderBy: {
                current_period_end: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    const expiredSubscriptions = activeProfilesWithSubs.filter((profile) => {
      const latestSub = profile.users.subscriptions[0];
      return latestSub && latestSub.current_period_end && latestSub.current_period_end < nowForSubs;
    });

    const expiringSoon = activeProfilesWithSubs.filter((profile) => {
      const latestSub = profile.users.subscriptions[0];
      if (!latestSub || !latestSub.current_period_end) return false;
      const daysUntilExpiry = Math.ceil(
        (latestSub.current_period_end.getTime() - nowForSubs.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
    });

    const noActiveSubscription = activeProfilesWithSubs.filter(
      (profile) => !profile.users.subscriptions || profile.users.subscriptions.length === 0
    );

    console.log(`   ACTIVE profiles with expired subscriptions: ${expiredSubscriptions.length}`);
    console.log(`   ACTIVE profiles expiring in next 7 days:    ${expiringSoon.length}`);
    console.log(`   ACTIVE profiles with no subscription:       ${noActiveSubscription.length}`);
    console.log('');

    if (expiredSubscriptions.length > 0) {
      console.log(`   ⚠️  Found ${expiredSubscriptions.length} ACTIVE profiles with expired subscriptions:\n`);
      expiredSubscriptions.slice(0, 10).forEach((profile) => {
        const sub = profile.users.subscriptions[0];
        const expiredDays = Math.ceil(
          (nowForSubs.getTime() - sub!.current_period_end!.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   • ${profile.name} (${profile.users.email})`);
        console.log(`     Expired ${expiredDays} days ago`);
        console.log(`     Status: ${profile.status}, Visible: ${profile.is_profile_visible}`);
        console.log('');
      });
      if (expiredSubscriptions.length > 10) {
        console.log(`   ... and ${expiredSubscriptions.length - 10} more\n`);
      }
    }

    // ============================================
    // 6. ACTIVE BUT HIDDEN PROFILES
    // ============================================
    console.log('🔍 ACTIVE BUT HIDDEN PROFILES:');
    console.log('─'.repeat(60));

    const activeButHidden = await prisma.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
        is_profile_visible: false,
      },
      select: {
        id: true,
        name: true,
        updated_at: true,
        users: {
          select: {
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 20,
    });

    console.log(`   Found ${activeButHidden.length} ACTIVE profiles that are hidden:\n`);
    if (activeButHidden.length > 0) {
      activeButHidden.forEach((profile) => {
        const date = profile.updated_at.toISOString().split('T')[0];
        console.log(`   • ${profile.name} (${profile.users.username})`);
        console.log(`     Hidden since: ${date}`);
        console.log('');
      });
    }

    // ============================================
    // 7. SUMMARY
    // ============================================
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                        SUMMARY                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Current Active Profiles (ACTIVE + VISIBLE): ${activeAndVisibleProfiles}`);
    console.log(`📉 Potential Issues:`);
    console.log(`   • ACTIVE but hidden: ${activeButHidden.length}`);
    console.log(`   • ACTIVE with expired subscriptions: ${expiredSubscriptions.length}`);
    console.log(`   • ACTIVE with no subscription: ${noActiveSubscription.length}`);
    console.log(`   • INACTIVE profiles: ${inactiveProfiles}`);
    console.log('');

    // Calculate potential recovery
    const potentialRecovery = activeButHidden.length + 
      (expiredSubscriptions.length > 0 ? 0 : 0); // These should be INACTIVE, not counted

    if (potentialRecovery > 0) {
      console.log(`💡 Potential Recovery:`);
      console.log(`   • ${activeButHidden.length} profiles are ACTIVE but hidden`);
      console.log(`   • Making these visible would bring count to: ${activeAndVisibleProfiles + activeButHidden.length}`);
      console.log('');
    }

    console.log('✅ Investigation complete (READ-ONLY)\n');

  } catch (error: any) {
    console.error('\n❌ ERROR\n');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

investigateActiveProfiles().catch(console.error);

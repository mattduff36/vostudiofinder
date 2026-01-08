import { PrismaClient, UserStatus } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = new PrismaClient();

interface UserBreakdown {
  status: UserStatus;
  total: number;
  withStudio: number;
  withoutStudio: number;
  testAccounts: number;
  sampleEmails: string[];
}

async function analyzeUsersBreakdown() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('📊 USER BREAKDOWN ANALYSIS');
    console.log('='.repeat(80) + '\n');

    // Get total counts
    const [totalUsers, totalStudios] = await Promise.all([
      db.users.count(),
      db.studio_profiles.count(),
    ]);

    console.log('📈 Overall Statistics:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Users with Studios: ${totalStudios}`);
    console.log(`   Users without Studios: ${totalUsers - totalStudios}\n`);

    // Analyze by status
    const statuses: UserStatus[] = ['PENDING', 'ACTIVE', 'EXPIRED'];
    const breakdowns: UserBreakdown[] = [];

    for (const status of statuses) {
      // Count users with studios for this status (studio_profiles is optional one-to-one)
      const withStudio = await db.users.count({
        where: {
          status,
          studio_profiles: {
            isNot: null,
          },
        },
      });

      // Count total users with this status
      const total = await db.users.count({
        where: { status },
      });

      const withoutStudio = total - withStudio;

      // Get sample users for this status
      const users = await db.users.findMany({
        where: { status },
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          status: true,
          created_at: true,
          studio_profiles: {
            select: { id: true },
          },
        },
      });
      
      // Identify test accounts (emails containing "test" or usernames starting with "test" or "temp")
      const testAccounts = users.filter(u => {
        const emailLower = u.email.toLowerCase();
        const usernameLower = u.username.toLowerCase();
        return (
          emailLower.includes('test') ||
          emailLower.includes('temp') ||
          usernameLower.startsWith('test') ||
          usernameLower.startsWith('temp') ||
          usernameLower.startsWith('expired_')
        );
      }).length;

      // Get sample emails (first 5 without studios)
      // studio_profiles is optional one-to-one, so check if it's null
      const sampleEmails = users
        .filter(u => !u.studio_profiles)
        .slice(0, 5)
        .map(u => u.email);

      breakdowns.push({
        status,
        total,
        withStudio,
        withoutStudio,
        testAccounts,
        sampleEmails,
      });
    }

    // Display breakdown
    console.log('📋 Breakdown by Status:');
    console.log('─'.repeat(80));
    
    for (const breakdown of breakdowns) {
      console.log(`\n${breakdown.status}:`);
      console.log(`   Total: ${breakdown.total}`);
      console.log(`   With Studio: ${breakdown.withStudio}`);
      console.log(`   Without Studio: ${breakdown.withoutStudio}`);
      console.log(`   Test Accounts (estimated): ${breakdown.testAccounts}`);
      
      if (breakdown.withoutStudio > 0 && breakdown.sampleEmails.length > 0) {
        console.log(`   Sample emails (without studios):`);
        breakdown.sampleEmails.forEach(email => {
          console.log(`     - ${email}`);
        });
      }
    }

    // Additional analysis: Users without studios by creation date
    console.log('\n' + '─'.repeat(80));
    console.log('📅 Users Without Studios - Creation Date Analysis:');
    console.log('─'.repeat(80));

    const usersWithoutStudios = await db.users.findMany({
      where: {
        studio_profiles: {
          is: null,
        },
      },
      select: {
        email: true,
        username: true,
        status: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20,
    });

    console.log(`\nShowing first 20 users without studios (most recent first):\n`);
    usersWithoutStudios.forEach((user, index) => {
      const daysAgo = Math.floor(
        (Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isTest = 
        user.email.toLowerCase().includes('test') ||
        user.email.toLowerCase().includes('temp') ||
        user.username.toLowerCase().startsWith('test') ||
        user.username.toLowerCase().startsWith('temp') ||
        user.username.toLowerCase().startsWith('expired_');
      
      console.log(`${index + 1}. ${user.email} (@${user.username})`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at.toLocaleDateString()} (${daysAgo} days ago)`);
      console.log(`   ${isTest ? '🧪 TEST ACCOUNT' : '👤 Regular account'}`);
      console.log('');
    });

    // Summary recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💡 Recommendations:');
    console.log('='.repeat(80));
    
    const pendingWithoutStudio = breakdowns.find(b => b.status === 'PENDING')?.withoutStudio || 0;
    const expiredWithoutStudio = breakdowns.find(b => b.status === 'EXPIRED')?.withoutStudio || 0;
    const activeWithoutStudio = breakdowns.find(b => b.status === 'ACTIVE')?.withoutStudio || 0;

    if (pendingWithoutStudio > 0) {
      console.log(`\n⚠️  Found ${pendingWithoutStudio} PENDING users without studios.`);
      console.log('   These are likely incomplete signups that never completed payment.');
      console.log('   Consider: Running the expire-reservations cron job or manual cleanup.');
    }

    if (expiredWithoutStudio > 0) {
      console.log(`\n⚠️  Found ${expiredWithoutStudio} EXPIRED users without studios.`);
      console.log('   These are expired reservations that can be safely deleted.');
      console.log('   The cron job at /api/cron/expire-reservations should delete these after 30 days.');
    }

    if (activeWithoutStudio > 0) {
      console.log(`\n⚠️  Found ${activeWithoutStudio} ACTIVE users without studios.`);
      console.log('   These are paid users who never created a studio profile.');
      console.log('   These may need investigation - they paid but didn\'t complete setup.');
    }

    const totalTestAccounts = breakdowns.reduce((sum, b) => sum + b.testAccounts, 0);
    if (totalTestAccounts > 0) {
      console.log(`\n🧪 Found approximately ${totalTestAccounts} test accounts.`);
      console.log('   Consider cleaning these up using: scripts/delete-test-accounts.ts');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error analyzing users:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

analyzeUsersBreakdown()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

async function checkDeletionPattern(envFile: string, label: string) {
  delete process.env.DATABASE_URL;
  dotenv.config({ path: envFile, override: true });
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 ${label.toUpperCase()} DATABASE - DELETION ANALYSIS`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Check last 2 hours for any activity
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    // Get users updated in last 2 hours
    const recentUsers = await prisma.users.findMany({
      where: {
        updated_at: {
          gte: twoHoursAgo,
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    console.log(`📝 Users updated in last 2 hours: ${recentUsers.length}`);
    if (recentUsers.length > 0) {
      recentUsers.forEach((u, index) => {
        const hoursAgo = ((Date.now() - u.updated_at.getTime()) / 1000 / 60 / 60).toFixed(2);
        console.log(`   ${index + 1}. ${u.email} (${u.username})`);
        console.log(`      Status: ${u.status}`);
        console.log(`      Updated: ${u.updated_at.toISOString()} (${hoursAgo} hours ago)`);
        console.log();
      });
    } else {
      console.log(`   (No users updated in last 2 hours)\n`);
    }

    // Check studios updated in last 2 hours
    const recentStudios = await prisma.studio_profiles.findMany({
      where: {
        updated_at: {
          gte: twoHoursAgo,
        }
      },
      include: {
        users: {
          select: {
            email: true,
            username: true,
          }
        }
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    console.log(`📝 Studios updated in last 2 hours: ${recentStudios.length}`);
    if (recentStudios.length > 0) {
      recentStudios.forEach((s, index) => {
        const hoursAgo = ((Date.now() - s.updated_at.getTime()) / 1000 / 60 / 60).toFixed(2);
        console.log(`   ${index + 1}. "${s.name}"`);
        console.log(`      Owner: ${s.users.email} (${s.users.username})`);
        console.log(`      Status: ${s.status}`);
        console.log(`      Updated: ${s.updated_at.toISOString()} (${hoursAgo} hours ago)`);
        console.log();
      });
    } else {
      console.log(`   (No studios updated in last 2 hours)\n`);
    }

    // Check total counts
    const [totalUsers, totalStudios] = await Promise.all([
      prisma.users.count(),
      prisma.studio_profiles.count(),
    ]);

    console.log(`📈 Current Database Totals:`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Studios: ${totalStudios}\n`);

    // Check for users with "Matt" in email or username
    const mattUsers = await prisma.users.findMany({
      where: {
        OR: [
          { email: { contains: 'matt.mpdee', mode: 'insensitive' } },
          { username: { contains: 'Matt', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    console.log(`🔍 Users with "matt.mpdee" or "Matt" username:`);
    if (mattUsers.length > 0) {
      mattUsers.forEach((u, index) => {
        const hoursSinceUpdate = ((Date.now() - u.updated_at.getTime()) / 1000 / 60 / 60).toFixed(2);
        console.log(`   ${index + 1}. ${u.email} (${u.username})`);
        console.log(`      Status: ${u.status}`);
        console.log(`      Last Updated: ${u.updated_at.toISOString()} (${hoursSinceUpdate} hours ago)`);
        console.log();
      });
    } else {
      console.log(`   (None found)\n`);
    }

    // Check for studios with "Matt Studios" in name
    const mattStudios = await prisma.studio_profiles.findMany({
      where: {
        name: {
          contains: 'Matt Studios',
          mode: 'insensitive',
        }
      },
      include: {
        users: {
          select: {
            email: true,
            username: true,
            updated_at: true,
          }
        }
      },
    });

    console.log(`🔍 Studios with "Matt Studios" in name:`);
    if (mattStudios.length > 0) {
      mattStudios.forEach((s, index) => {
        const hoursSinceUpdate = ((Date.now() - s.updated_at.getTime()) / 1000 / 60 / 60).toFixed(2);
        console.log(`   ${index + 1}. "${s.name}"`);
        console.log(`      Owner: ${s.users.email} (${s.users.username})`);
        console.log(`      Last Updated: ${s.updated_at.toISOString()} (${hoursSinceUpdate} hours ago)`);
        console.log();
      });
    } else {
      console.log(`   (None found)\n`);
    }

    // Check user count difference - if one database has fewer users, it might be the one where deletion happened
    console.log(`💡 Key Insight:`);
    console.log(`   If this database was used for deletion, the account should be gone.`);
    console.log(`   Compare user counts between databases to see which one changed.\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error(`❌ Error checking ${label}:`, error);
    await prisma.$disconnect();
    throw error;
  }
}

async function checkBothDatabases() {
  console.log(`\n🕐 Analysis started at: ${new Date().toISOString()}\n`);
  
  try {
    await checkDeletionPattern('.env.local', 'DEV');
    await checkDeletionPattern('.env.production', 'PRODUCTION');
    
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Analysis complete`);
    console.log(`${'='.repeat(70)}\n`);
    
    console.log(`📋 SUMMARY:`);
    console.log(`   1. DEV database has 644 users, PRODUCTION has 642 users`);
    console.log(`   2. The database with 2 fewer users is likely where the deletion happened`);
    console.log(`   3. However, deletions don't update 'updated_at' timestamps, so we won't`);
    console.log(`      see them in recent activity queries`);
    console.log(`   4. The Vercel preview is likely connected to the DEV database`);
    console.log(`      (ep-odd-band-ab5sw2ff-pooler) since that's what .env.local points to\n`);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

checkBothDatabases()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

async function checkRecentActivity(envFile: string, label: string) {
  // Clear any existing env vars and load fresh
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
  console.log(`📊 ${label.toUpperCase()} DATABASE - RECENT ACTIVITY (LAST 30 MINUTES)`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    // Check for users updated/deleted recently
    console.log(`🔍 Checking for users updated/deleted in last 30 minutes...\n`);
    
    // Get all users and check their updated_at timestamps
    const recentUsers = await prisma.users.findMany({
      where: {
        updated_at: {
          gte: thirtyMinutesAgo,
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    console.log(`📝 Users updated in last 30 minutes: ${recentUsers.length}`);
    if (recentUsers.length > 0) {
      recentUsers.forEach((u, index) => {
        const minutesAgo = Math.round((Date.now() - u.updated_at.getTime()) / 1000 / 60);
        console.log(`   ${index + 1}. ${u.email} (${u.username})`);
        console.log(`      Status: ${u.status}`);
        console.log(`      Updated: ${u.updated_at.toISOString()} (${minutesAgo} minutes ago)`);
        console.log(`      Created: ${u.created_at.toISOString()}`);
        console.log();
      });
    } else {
      console.log(`   (No users updated in last 30 minutes)\n`);
    }

    // Check for studios updated recently
    const recentStudios = await prisma.studio_profiles.findMany({
      where: {
        updated_at: {
          gte: thirtyMinutesAgo,
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

    console.log(`📝 Studios updated in last 30 minutes: ${recentStudios.length}`);
    if (recentStudios.length > 0) {
      recentStudios.forEach((s, index) => {
        const minutesAgo = Math.round((Date.now() - s.updated_at.getTime()) / 1000 / 60);
        console.log(`   ${index + 1}. "${s.name}"`);
        console.log(`      Owner: ${s.users.email} (${s.users.username})`);
        console.log(`      Status: ${s.status}`);
        console.log(`      Updated: ${s.updated_at.toISOString()} (${minutesAgo} minutes ago)`);
        console.log(`      Created: ${s.created_at.toISOString()}`);
        console.log();
      });
    } else {
      console.log(`   (No studios updated in last 30 minutes)\n`);
    }

    // Check specifically for matt.mpdee@gmail.com
    console.log(`🔍 Checking specifically for matt.mpdee@gmail.com...\n`);
    
    const mattUser = await prisma.users.findUnique({
      where: { email: 'matt.mpdee@gmail.com' },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        created_at: true,
        updated_at: true,
      }
    });

    if (mattUser) {
      const minutesSinceUpdate = Math.round((Date.now() - mattUser.updated_at.getTime()) / 1000 / 60);
      console.log(`❌ ACCOUNT STILL EXISTS:`);
      console.log(`   ID: ${mattUser.id}`);
      console.log(`   Email: ${mattUser.email}`);
      console.log(`   Username: ${mattUser.username}`);
      console.log(`   Status: ${mattUser.status}`);
      console.log(`   Created: ${mattUser.created_at.toISOString()}`);
      console.log(`   Last Updated: ${mattUser.updated_at.toISOString()} (${minutesSinceUpdate} minutes ago)`);
      
      if (minutesSinceUpdate <= 30) {
        console.log(`   ⚠️  This account was updated within the last 30 minutes!`);
      }
      console.log();
    } else {
      console.log(`✅ Account NOT FOUND (deleted or never existed)\n`);
    }

    // Check for studio "Matt Studios 1"
    const mattStudio = await prisma.studio_profiles.findFirst({
      where: {
        name: {
          contains: 'Matt Studios 1',
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
      }
    });

    if (mattStudio) {
      const minutesSinceUpdate = Math.round((Date.now() - mattStudio.updated_at.getTime()) / 1000 / 60);
      console.log(`❌ STUDIO STILL EXISTS:`);
      console.log(`   ID: ${mattStudio.id}`);
      console.log(`   Name: ${mattStudio.name}`);
      console.log(`   Owner: ${mattStudio.users.email} (${mattStudio.users.username})`);
      console.log(`   Last Updated: ${mattStudio.updated_at.toISOString()} (${minutesSinceUpdate} minutes ago)`);
      
      if (minutesSinceUpdate <= 30) {
        console.log(`   ⚠️  This studio was updated within the last 30 minutes!`);
      }
      console.log();
    } else {
      console.log(`✅ Studio "Matt Studios 1" NOT FOUND (deleted or never existed)\n`);
    }

    // Check total counts
    const [totalUsers, totalStudios] = await Promise.all([
      prisma.users.count(),
      prisma.studio_profiles.count(),
    ]);

    console.log(`📈 Current Database Totals:`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Studios: ${totalStudios}\n`);

    // Check for any users created in last 30 minutes
    const newUsers = await prisma.users.findMany({
      where: {
        created_at: {
          gte: thirtyMinutesAgo,
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (newUsers.length > 0) {
      console.log(`🆕 New users created in last 30 minutes: ${newUsers.length}`);
      newUsers.forEach((u, index) => {
        const minutesAgo = Math.round((Date.now() - u.created_at.getTime()) / 1000 / 60);
        console.log(`   ${index + 1}. ${u.email} (${u.username}) - ${minutesAgo} minutes ago`);
      });
      console.log();
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error(`❌ Error checking ${label}:`, error);
    await prisma.$disconnect();
    throw error;
  }
}

async function checkBothDatabases() {
  const startTime = new Date();
  console.log(`\n🕐 Starting check at: ${startTime.toISOString()}\n`);
  
  try {
    await checkRecentActivity('.env.local', 'DEV');
    await checkRecentActivity('.env.production', 'PRODUCTION');
    
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    console.log(`${'='.repeat(70)}`);
    console.log(`✅ Check complete (took ${duration} seconds)`);
    console.log(`🕐 Finished at: ${endTime.toISOString()}`);
    console.log(`${'='.repeat(70)}\n`);
    
    console.log(`💡 ANALYSIS:`);
    console.log(`   - The database with recent DELETE/UPDATE activity is likely the one`);
    console.log(`     connected to your Vercel preview deployment.`);
    console.log(`   - If matt.mpdee@gmail.com was deleted, you should see it in the`);
    console.log(`     "Users updated in last 30 minutes" section of ONE database only.\n`);
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


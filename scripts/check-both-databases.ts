import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

async function checkDatabase(envFile: string, label: string) {
  dotenv.config({ path: envFile, override: true });
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${label.toUpperCase()} DATABASE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Check total counts
    const [totalUsers, totalStudios] = await Promise.all([
      prisma.users.count(),
      prisma.studio_profiles.count(),
    ]);

    console.log(`📈 Total Counts:`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Studios: ${totalStudios}\n`);

    // Check for the specific account
    const email = 'matt.mpdee@gmail.com';
    const username = 'Matt';
    const studioName = 'Matt Studios 1';

    console.log(`🔍 Searching for deleted account:`);
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log(`   Studio: ${studioName}\n`);

    // Check by email
    const userByEmail = await prisma.users.findUnique({
      where: { email: email },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        updated_at: true,
      }
    });

    if (userByEmail) {
      console.log(`❌ USER STILL EXISTS:`);
      console.log(`   ID: ${userByEmail.id}`);
      console.log(`   Email: ${userByEmail.email}`);
      console.log(`   Username: ${userByEmail.username}`);
      console.log(`   Status: ${userByEmail.status}`);
      console.log(`   Created: ${userByEmail.created_at.toISOString()}`);
      console.log(`   Updated: ${userByEmail.updated_at.toISOString()}\n`);
    } else {
      console.log(`✅ User with email "${email}" NOT FOUND (deleted)\n`);
    }

    // Check by username
    const userByUsername = await prisma.users.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
      }
    });

    if (userByUsername && userByUsername.email.toLowerCase() !== email.toLowerCase()) {
      console.log(`⚠️  Found different user with username "${username}":`);
      console.log(`   Email: ${userByUsername.email}`);
      console.log(`   ID: ${userByUsername.id}\n`);
    } else if (!userByUsername) {
      console.log(`✅ User with username "${username}" NOT FOUND (deleted)\n`);
    }

    // Check for studio
    const studio = await prisma.studio_profiles.findFirst({
      where: {
        name: {
          contains: studioName,
          mode: 'insensitive',
        }
      },
      include: {
        users: {
          select: {
            email: true,
            username: true,
          }
        }
      }
    });

    if (studio) {
      console.log(`❌ STUDIO STILL EXISTS:`);
      console.log(`   ID: ${studio.id}`);
      console.log(`   Name: ${studio.name}`);
      console.log(`   Owner: ${studio.users.email} (${studio.users.username})\n`);
    } else {
      console.log(`✅ Studio "${studioName}" NOT FOUND (deleted)\n`);
    }

    // Check for any similar accounts
    const similarUsers = await prisma.users.findMany({
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
      },
      take: 5,
    });

    if (similarUsers.length > 0) {
      console.log(`📋 Similar accounts found (${similarUsers.length}):`);
      similarUsers.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.email} (${u.username}) - ${u.status} - Created: ${u.created_at.toISOString()}`);
      });
      console.log();
    }

    // Check recent users (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentUsers = await prisma.users.findMany({
      where: {
        OR: [
          { created_at: { gte: oneDayAgo } },
          { updated_at: { gte: oneDayAgo } }
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 10,
    });

    if (recentUsers.length > 0) {
      console.log(`🕐 Recent activity (last 24 hours):`);
      recentUsers.forEach((u, index) => {
        const isRecent = u.updated_at > oneDayAgo;
        console.log(`   ${index + 1}. ${u.email} (${u.username})`);
        console.log(`      Created: ${u.created_at.toISOString()}`);
        console.log(`      Updated: ${u.updated_at.toISOString()} ${isRecent ? '🆕' : ''}`);
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
  try {
    await checkDatabase('.env.local', 'DEV');
    await checkDatabase('.env.production', 'PRODUCTION');
    
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Check complete`);
    console.log(`${'='.repeat(60)}\n`);
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


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

async function testProductionDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         PRODUCTION DATABASE CONNECTION TEST                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Mask the URL
  const maskedUrl = databaseUrl.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3');
  console.log('🔍 Testing: ' + maskedUrl + '\n');

  try {
    console.log('⏳ Attempting to connect...');
    const startTime = Date.now();
    
    await prisma.$connect();
    const connectTime = Date.now() - startTime;
    
    console.log(`✅ Connection successful! (${connectTime}ms)`);
    
    if (connectTime > 2000) {
      console.log('⚠️  Note: Connection took > 2 seconds (database was likely sleeping)\n');
    } else {
      console.log('');
    }

    // Test query
    console.log('⏳ Testing query...');
    const queryStart = Date.now();
    const userCount = await prisma.users.count();
    const queryTime = Date.now() - queryStart;
    console.log(`✅ Query successful! Found ${userCount} users (${queryTime}ms)\n`);

    // Test homepage query
    console.log('⏳ Testing homepage featured studios query...');
    const featuredStart = Date.now();
    const featuredStudios = await prisma.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
        is_featured: true,
        is_profile_visible: true,
      },
      include: {
        users: {
          select: {
            display_name: true,
            username: true,
          },
        },
      },
      take: 6,
    });
    const featuredTime = Date.now() - featuredStart;
    console.log(`✅ Homepage query successful! Found ${featuredStudios.length} featured studios (${featuredTime}ms)\n`);

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                 ✅ ALL TESTS PASSED                            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Results:');
    console.log(`   Total connection time: ${connectTime}ms`);
    console.log(`   Total query time: ${queryTime + featuredTime}ms`);
    console.log(`   Database is healthy and responding\n`);

    if (connectTime > 1000) {
      console.log('💡 INSIGHTS:');
      console.log('   The database was in sleep mode when this test started.');
      console.log('   Neon serverless databases sleep after ~5 minutes of inactivity.');
      console.log('   First request after sleep takes 1-3 seconds to wake up.');
      console.log('   This is why error handling in production code is essential.\n');
    }

  } catch (error: any) {
    console.error('\n❌ CONNECTION FAILED\n');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    
    console.log('\n🔧 POSSIBLE CAUSES:\n');
    console.log('1. Database compute endpoint is suspended or deleted');
    console.log('   → Check Neon console: https://console.neon.tech');
    console.log('');
    console.log('2. Network connectivity issues');
    console.log('   → Try: ping ep-plain-glitter-abljx7c3-pooler.eu-west-2.aws.neon.tech');
    console.log('');
    console.log('3. Firewall blocking outbound PostgreSQL connections');
    console.log('   → Check port 5432 is not blocked');
    console.log('');
    console.log('4. Database credentials changed');
    console.log('   → Verify DATABASE_URL in Vercel matches Neon console');
    console.log('');
    console.log('5. Neon project billing/quota exceeded');
    console.log('   → Check Neon project status and billing\n');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testProductionDatabase().catch(console.error);





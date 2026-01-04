import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function diagnoseDatabaseConnection() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           DATABASE CONNECTION DIAGNOSTICS                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Check environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.log('\n📝 Please check:');
    console.log('   1. .env.production file exists');
    console.log('   2. DATABASE_URL is defined in .env.production');
    console.log('   3. Environment variables are loaded correctly\n');
    process.exit(1);
  }

  // Mask sensitive parts of the URL
  const maskedUrl = databaseUrl.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3');
  console.log('🔍 Database Configuration:');
  console.log(`   URL: ${maskedUrl}`);
  
  // Extract database details
  const urlPattern = /postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/(.+)/;
  const match = databaseUrl.match(urlPattern);
  
  if (match) {
    const [, user, , host, port, database] = match;
    console.log(`   User: ${user}`);
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   Database: ${database.split('?')[0]}\n`);
    
    // Check if it's a Neon database
    if (host.includes('neon.tech')) {
      console.log('🔵 Detected: Neon Serverless PostgreSQL');
      console.log('   Note: Neon databases may enter sleep mode after 5 minutes of inactivity\n');
    }
  }

  console.log('⏳ Testing connection...\n');

  try {
    // Test 1: Simple connection
    console.log('Test 1: Basic Connection');
    const startTime = Date.now();
    await prisma.$connect();
    const connectTime = Date.now() - startTime;
    console.log(`✅ Connected successfully in ${connectTime}ms`);
    
    if (connectTime > 2000) {
      console.log('⚠️  WARNING: Connection took > 2 seconds (database may have been sleeping)\n');
    } else {
      console.log('');
    }

    // Test 2: Simple query
    console.log('Test 2: Simple Query');
    const queryStart = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const queryTime = Date.now() - queryStart;
    console.log(`✅ Query executed successfully in ${queryTime}ms`);
    console.log(`   Result: ${JSON.stringify(result)}\n`);

    // Test 3: Count users
    console.log('Test 3: Count Users Table');
    const countStart = Date.now();
    const userCount = await prisma.users.count();
    const countTime = Date.now() - countStart;
    console.log(`✅ Users count: ${userCount} (${countTime}ms)\n`);

    // Test 4: Count studios
    console.log('Test 4: Count Studios Table');
    const studiosStart = Date.now();
    const studioCount = await prisma.studio_profiles.count();
    const studiosTime = Date.now() - studiosStart;
    console.log(`✅ Studios count: ${studioCount} (${studiosTime}ms)\n`);

    // Test 5: Featured studios query (homepage query)
    console.log('Test 5: Featured Studios Query (Homepage)');
    const featuredStart = Date.now();
    const featuredStudios = await prisma.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
        is_featured: true,
        is_profile_visible: true,
      },
      take: 6,
    });
    const featuredTime = Date.now() - featuredStart;
    console.log(`✅ Featured studios found: ${featuredStudios.length} (${featuredTime}ms)\n`);

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    DIAGNOSTIC SUMMARY                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log('✅ All tests passed successfully');
    console.log(`📊 Total time: ${Date.now() - startTime}ms\n`);
    
    if (connectTime > 1000 || queryTime > 1000) {
      console.log('⚠️  RECOMMENDATIONS:');
      console.log('   - Database is responding but connection is slow');
      console.log('   - This is normal for Neon serverless databases after sleep');
      console.log('   - Consider using connection pooling or keeping database awake');
      console.log('   - Error handling in code is essential for production\n');
    } else {
      console.log('✅ Database performance is good\n');
    }

  } catch (error: any) {
    console.error('\n❌ CONNECTION FAILED\n');
    console.error('Error Details:');
    console.error(`   Type: ${error.constructor.name}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }

    console.log('\n🔧 TROUBLESHOOTING STEPS:\n');
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('1. Database server is unreachable:');
      console.log('   ✓ Check if Neon project is active (https://console.neon.tech)');
      console.log('   ✓ Verify database hasn\'t been suspended or deleted');
      console.log('   ✓ Check network connectivity');
      console.log('   ✓ Verify firewall/security group settings');
      console.log('   ✓ Confirm DATABASE_URL has correct host and port\n');
      
      console.log('2. If using Neon:');
      console.log('   ✓ Database may be in sleep mode (first connection takes 1-2s)');
      console.log('   ✓ Try running this script again');
      console.log('   ✓ Check Neon console for compute endpoint status');
      console.log('   ✓ Verify branch/database still exists\n');
    }
    
    if (error.message.includes('password authentication failed')) {
      console.log('3. Authentication failed:');
      console.log('   ✓ Verify DATABASE_URL password is correct');
      console.log('   ✓ Check if password contains special characters (needs URL encoding)');
      console.log('   ✓ Confirm user exists in database\n');
    }
    
    console.log('4. Vercel-specific issues:');
    console.log('   ✓ Ensure DATABASE_URL is set in Vercel environment variables');
    console.log('   ✓ Check if variable is available in production environment');
    console.log('   ✓ Verify no typos in environment variable name');
    console.log('   ✓ Redeploy after changing environment variables\n');
    
    console.log('5. Connection string format:');
    console.log('   Expected: postgresql://user:password@host:port/database');
    console.log('   Current:  ' + maskedUrl + '\n');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostics
diagnoseDatabaseConnection().catch(console.error);





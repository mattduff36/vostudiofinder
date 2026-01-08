import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  const email = 'matt.mpdee@gmail.com';
  
  console.log(`\n🔍 Inspecting Neon Database\n`);
  console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Check total user count
    const totalUsers = await prisma.users.count();
    console.log(`📊 Total users in database: ${totalUsers}`);

    // Check for any user with that email (raw SQL to bypass Prisma)
    console.log(`\n🔍 Checking for email: ${email}\n`);
    
    const rawResult = await prisma.$queryRaw<Array<{id: string, email: string, username: string, status: string}>>`
      SELECT id, email, username, status 
      FROM users 
      WHERE email = ${email}
    `;

    if (rawResult.length > 0) {
      console.log(`✅ Found ${rawResult.length} user(s) with exact email:`);
      rawResult.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Status: ${user.status}`);
      });
    } else {
      console.log(`❌ No user found with exact email: ${email}`);
    }

    // Check for case variations
    const caseVariations = await prisma.$queryRaw<Array<{id: string, email: string, username: string, status: string}>>`
      SELECT id, email, username, status 
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (caseVariations.length > 0 && caseVariations.length !== rawResult.length) {
      console.log(`\n⚠️  Found ${caseVariations.length} user(s) with case-insensitive match:`);
      caseVariations.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Status: ${user.status}`);
      });
    }

    // Check for PENDING users (might be stuck)
    const pendingUsers = await prisma.users.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        reservation_expires_at: true,
      },
      take: 10,
    });

    console.log(`\n📋 PENDING users (showing first 10): ${pendingUsers.length}`);
    pendingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.username}) - Created: ${user.created_at.toISOString()}`);
    });

    // Check database constraints
    console.log(`\n🔍 Checking database constraints...\n`);
    const constraints = await prisma.$queryRaw<Array<{constraint_name: string, table_name: string}>>`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users' 
        AND constraint_type = 'UNIQUE'
    `;

    console.log(`Unique constraints on users table:`);
    constraints.forEach((constraint) => {
      console.log(`  - ${constraint.constraint_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


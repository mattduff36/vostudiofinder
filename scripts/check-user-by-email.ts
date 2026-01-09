import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkUserByEmail() {
  const email = 'matt.mpdee@gmail.com';
  
  console.log(`\n🔍 Searching for users with email: ${email}\n`);
  console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Try exact match first
    const exactMatch = await prisma.users.findUnique({
      where: { email: email },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
      }
    });

    if (exactMatch) {
      console.log('✅ Found exact match:');
      console.log(JSON.stringify(exactMatch, null, 2));
    } else {
      console.log('❌ No exact match found');
    }

    // Try case-insensitive search
    console.log('\n🔍 Searching case-insensitively...\n');
    const caseInsensitiveMatches = await prisma.users.findMany({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
      }
    });

    if (caseInsensitiveMatches.length > 0) {
      console.log(`✅ Found ${caseInsensitiveMatches.length} case-insensitive match(es):`);
      caseInsensitiveMatches.forEach((user, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log(JSON.stringify(user, null, 2));
      });
    } else {
      console.log('❌ No case-insensitive matches found');
    }

    // List all users with similar emails
    console.log('\n🔍 Searching for similar emails (contains "matt.mpdee")...\n');
    const similarEmails = await prisma.$queryRaw<Array<{email: string, id: string, username: string}>>`
      SELECT email, id, username 
      FROM users 
      WHERE LOWER(email) LIKE LOWER(${'%matt.mpdee%'})
      LIMIT 10
    `;

    if (similarEmails.length > 0) {
      console.log(`✅ Found ${similarEmails.length} similar email(s):`);
      similarEmails.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.username}) - ID: ${user.id}`);
      });
    } else {
      console.log('❌ No similar emails found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUserByEmail()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


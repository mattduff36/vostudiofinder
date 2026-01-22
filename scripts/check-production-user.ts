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

async function checkUser(email: string) {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         PRODUCTION DATABASE - USER LOOKUP                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`🔍 Searching for: ${email}\n`);

    await prisma.$connect();

    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        role: true,
        status: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
        last_login: true,
        reservation_expires_at: true,
        payment_attempted_at: true,
        payment_retry_count: true,
      },
    });

    if (user) {
      console.log('✅ USER FOUND IN PRODUCTION DATABASE');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`📧 Email:              ${user.email}`);
      console.log(`👤 Username:           ${user.username}`);
      console.log(`🏷️  Display Name:       ${user.display_name}`);
      console.log(`🔑 Role:               ${user.role}`);
      console.log(`📊 Status:             ${user.status}`);
      console.log(`✉️  Email Verified:     ${user.email_verified}`);
      console.log(`🆔 User ID:            ${user.id}`);
      console.log('\n' + '─'.repeat(63));
      console.log('⏰ TIMESTAMPS');
      console.log('─'.repeat(63));
      console.log(`📅 Created:            ${user.created_at.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}`);
      console.log(`🔄 Updated:            ${user.updated_at.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}`);
      console.log(`🔓 Last Login:         ${user.last_login ? user.last_login.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' }) : 'Never'}`);
      
      if (user.reservation_expires_at) {
        console.log(`⏳ Reservation Expires: ${user.reservation_expires_at.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}`);
      }
      if (user.payment_attempted_at) {
        console.log(`💳 Payment Attempted:   ${user.payment_attempted_at.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}`);
        console.log(`🔁 Payment Retries:     ${user.payment_retry_count}`);
      }
      
      // Calculate account age
      const now = new Date();
      const ageMs = now.getTime() - user.created_at.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const ageMinutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log('\n' + '─'.repeat(63));
      console.log('📊 ACCOUNT AGE');
      console.log('─'.repeat(63));
      console.log(`⏱️  ${ageDays} days, ${ageHours} hours, ${ageMinutes} minutes old`);
      
      if (ageDays === 0 && ageHours < 1) {
        console.log('🆕 VERY NEW ACCOUNT - Created within the last hour!');
      } else if (ageDays === 0) {
        console.log('🆕 NEW ACCOUNT - Created today!');
      } else if (ageDays <= 7) {
        console.log('🆕 RECENT ACCOUNT - Created within the last week');
      }
      
      console.log('\n═══════════════════════════════════════════════════════════════\n');
    } else {
      console.log('❌ USER NOT FOUND IN PRODUCTION DATABASE');
      console.log(`\nNo user with email "${email}" exists in production.\n`);
    }
  } catch (error: any) {
    console.error('\n❌ ERROR QUERYING PRODUCTION DATABASE\n');
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('\n❌ Error: Email address required\n');
  console.error('Usage: npx tsx scripts/check-production-user.ts <email>\n');
  console.error('Example: npx tsx scripts/check-production-user.ts user@example.com\n');
  process.exit(1);
}

checkUser(email);

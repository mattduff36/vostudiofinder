import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestAccounts() {
  const testEmail = 'matt.mpdee@gmail.com';
  
  console.log(`\n🔍 Searching for accounts with email: ${testEmail}\n`);

  try {
    // Find all users with the test email
    const users = await prisma.users.findMany({
      where: {
        email: testEmail
      },
      include: {
        studio_profiles: true,
        payments: true,
        subscriptions: true,
        accounts: true
      }
    });

    if (users.length === 0) {
      console.log('✅ No test accounts found with that email.\n');
      return;
    }

    console.log(`⚠️  Found ${users.length} account(s) with email ${testEmail}:\n`);

    users.forEach((user, index) => {
      console.log(`Account ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Display Name: ${user.display_name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Email Verified: ${user.email_verified}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Has Studio Profile: ${user.studio_profiles ? 'Yes' : 'No'}`);
      console.log(`  Payment Records: ${user.payments.length}`);
      console.log(`  Subscriptions: ${user.subscriptions.length}`);
      console.log(`  OAuth Accounts: ${user.accounts.length}`);
      console.log(`  Created: ${user.created_at.toISOString()}`);
      console.log();
    });

    console.log('🗑️  Deleting all accounts...\n');

    // Delete each user (delete related records first due to constraints)
    for (const user of users) {
      console.log(`Deleting user: ${user.username} (${user.id})...`);
      
      // Delete subscriptions first (foreign key constraint)
      if (user.subscriptions.length > 0) {
        console.log(`  Deleting ${user.subscriptions.length} subscription(s)...`);
        await prisma.subscriptions.deleteMany({
          where: { user_id: user.id }
        });
      }
      
      // Delete payments
      if (user.payments.length > 0) {
        console.log(`  Deleting ${user.payments.length} payment record(s)...`);
        await prisma.payments.deleteMany({
          where: { user_id: user.id }
        });
      }
      
      // Now delete the user (CASCADE will handle other related records)
      await prisma.users.delete({
        where: { id: user.id }
      });
      
      console.log(`✅ Deleted: ${user.username}\n`);
    }

    console.log(`✅ Successfully deleted ${users.length} test account(s).\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteTestAccounts()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


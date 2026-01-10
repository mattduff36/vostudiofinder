import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Check if an email or username indicates a test account
 */
function isTestAccount(email: string, username: string): boolean {
  const emailLower = email.toLowerCase();
  const usernameLower = username.toLowerCase();
  
  return (
    emailLower.includes('test') ||
    emailLower.includes('temp') ||
    emailLower.endsWith('@test.com') ||
    usernameLower.startsWith('test') ||
    usernameLower.startsWith('temp') ||
    usernameLower.startsWith('expired_')
  );
}

async function deleteAllTestAccounts() {
  try {
    console.log('\n🔍 Finding all test accounts...\n');

    // Find all users
    const allUsers = await db.users.findMany({
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
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filter test accounts
    const testAccounts = allUsers.filter(user => 
      isTestAccount(user.email, user.username)
    );

    if (testAccounts.length === 0) {
      console.log('✅ No test accounts found. Database is clean!');
      rl.close();
      await db.$disconnect();
      return;
    }

    console.log(`Found ${testAccounts.length} test accounts:\n`);
    console.log('─'.repeat(100));
    
    // Group by type
    const withStudios = testAccounts.filter(u => u.studio_profiles !== null);
    const withoutStudios = testAccounts.filter(u => u.studio_profiles === null);
    
    console.log(`\n📊 Breakdown:`);
    console.log(`   Total test accounts: ${testAccounts.length}`);
    console.log(`   With studios: ${withStudios.length}`);
    console.log(`   Without studios: ${withoutStudios.length}\n`);

    // Show first 20
    const toShow = testAccounts.slice(0, 20);
    toShow.forEach((user, index) => {
      console.log(`${index + 1}. ${user.display_name} (${user.email})`);
      console.log(`   Username: @${user.username}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at.toLocaleDateString()}`);
      console.log(`   Has Studio: ${user.studio_profiles !== null ? 'Yes' : 'No'}`);
      console.log(`   Payments: ${user._count.payments}`);
      console.log('─'.repeat(100));
    });

    if (testAccounts.length > 20) {
      console.log(`\n... and ${testAccounts.length - 20} more test accounts\n`);
    }

    console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE all these test accounts and their data:');
    console.log('   - User accounts');
    console.log('   - Payment records');
    console.log('   - Refund records');
    console.log('   - Studio profiles (if any)');
    console.log('   - Studio images');
    console.log('   - Studio types');
    console.log('   - All related data\n');

    // Check for --confirm flag
    const hasConfirmFlag = process.argv.includes('--confirm');

    if (!hasConfirmFlag) {
      const answer = await question('Type "DELETE ALL TEST ACCOUNTS" to confirm: ');
      if (answer !== 'DELETE ALL TEST ACCOUNTS') {
        console.log('\n❌ Deletion cancelled.');
        rl.close();
        await db.$disconnect();
        return;
      }
    }

    console.log('\n🗑️  Deleting test accounts...\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const user of testAccounts) {
      try {
        await db.$transaction(async (tx) => {
          // 1. Delete studio-related data if exists
          if (user.studio_profiles) {
            const studioId = user.studio_profiles.id;
            
            // Delete studio types
            await tx.studio_studio_types.deleteMany({
              where: { studio_id: studioId },
            });

            // Delete studio images
            await tx.studio_images.deleteMany({
              where: { studio_id: studioId },
            });

            // Delete studio services
            await tx.studio_services.deleteMany({
              where: { studio_id: studioId },
            });

            // Delete reviews for this studio
            await tx.reviews.deleteMany({
              where: { studio_id: studioId },
            });

            // Delete studio profile
            await tx.studio_profiles.delete({
              where: { id: studioId },
            });
          }

          // 2. Get payment IDs for refund deletion
          const userPayments = await tx.payments.findMany({
            where: { user_id: user.id },
            select: { id: true },
          });
          const paymentIds = userPayments.map(p => p.id);

          // 3. Delete refunds
          await tx.refunds.deleteMany({
            where: {
              OR: [
                { user_id: user.id },
                { payment_id: { in: paymentIds } },
              ],
            },
          });

          // 4. Delete payments
          await tx.payments.deleteMany({
            where: { user_id: user.id },
          });

          // 5. Delete subscriptions
          await tx.subscriptions.deleteMany({
            where: { user_id: user.id },
          });

          // 6. Delete sessions
          await tx.sessions.deleteMany({
            where: { user_id: user.id },
          });

          // 7. Delete OAuth accounts
          await tx.accounts.deleteMany({
            where: { user_id: user.id },
          });

          // 8. Delete messages
          await tx.messages.deleteMany({
            where: {
              OR: [
                { sender_id: user.id },
                { receiver_id: user.id },
              ],
            },
          });

          // 9. Delete user connections
          await tx.user_connections.deleteMany({
            where: {
              OR: [
                { user_id: user.id },
                { connected_user_id: user.id },
              ],
            },
          });

          // 10. Delete user metadata
          await tx.user_metadata.deleteMany({
            where: { user_id: user.id },
          });

          // 11. Finally, delete the user
          await tx.users.delete({
            where: { id: user.id },
          });
        });

        deletedCount++;
        if (deletedCount % 10 === 0) {
          console.log(`   Deleted ${deletedCount}/${testAccounts.length}...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error deleting ${user.email}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n' + '═'.repeat(100));
    console.log('✅ Deletion Complete!');
    console.log(`   Successfully deleted: ${deletedCount} test accounts`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} accounts`);
    }
    console.log('═'.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

deleteAllTestAccounts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


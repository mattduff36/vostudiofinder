import * as dotenv from 'dotenv';
import { PrismaClient, UserStatus } from '@prisma/client';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function deleteAllPendingUsers() {
  try {
    console.log('🔍 Finding all PENDING users...\n');

    // Find all PENDING users
    const pendingUsers = await db.users.findMany({
      where: {
        status: UserStatus.PENDING,
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        created_at: true,
        studio_profiles: {
          select: {
            id: true,
          },
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

    if (pendingUsers.length === 0) {
      console.log('✅ No PENDING users found. Database is clean!');
      rl.close();
      await db.$disconnect();
      return;
    }

    console.log(`Found ${pendingUsers.length} PENDING users:\n`);
    console.log('─'.repeat(100));
    pendingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.display_name} (${user.email})`);
      console.log(`   Username: @${user.username}`);
      console.log(`   Created: ${user.created_at.toLocaleDateString()}`);
      console.log(`   Payments: ${user._count.payments}, Studio Profile: ${user.studio_profiles ? 'Yes' : 'No'}`);
      console.log('─'.repeat(100));
    });

    console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE all these users and their data:');
    console.log('   - User accounts');
    console.log('   - Payment records');
    console.log('   - Refund records');
    console.log('   - Studio profiles');
    console.log('   - Studio images');
    console.log('   - Studio types');
    console.log('   - All verification tokens\n');

    // Check for --confirm flag
    const hasConfirmFlag = process.argv.includes('--confirm');

    if (!hasConfirmFlag) {
      const answer = await question('Type "DELETE ALL PENDING USERS" to confirm: ');

      if (answer !== 'DELETE ALL PENDING USERS') {
        console.log('\n❌ Deletion cancelled. No changes made.');
        rl.close();
        await db.$disconnect();
        return;
      }
    } else {
      console.log('✅ --confirm flag detected. Proceeding with deletion...\n');
    }

    console.log('\n🗑️  Starting deletion process...\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const user of pendingUsers) {
      try {
        await db.$transaction(async (tx) => {
          console.log(`Deleting ${user.email}...`);

          // 1. Get all payment IDs for this user
          const payments = await tx.payments.findMany({
            where: { user_id: user.id },
            select: { id: true },
          });

          const paymentIds = payments.map(p => p.id);

          // 2. Delete refunds first (if any exist)
          if (paymentIds.length > 0) {
            const refundsDeleted = await tx.refunds.deleteMany({
              where: {
                OR: [
                  { user_id: user.id },
                  { payment_id: { in: paymentIds } },
                ],
              },
            });
            if (refundsDeleted.count > 0) {
              console.log(`  ✓ Deleted ${refundsDeleted.count} refund(s)`);
            }
          }

          // 3. Delete payments
          if (paymentIds.length > 0) {
            const paymentsDeleted = await tx.payments.deleteMany({
              where: { user_id: user.id },
            });
            console.log(`  ✓ Deleted ${paymentsDeleted.count} payment(s)`);
          }

          // 4. Get all studio profiles for this user
          const studioProfiles = await tx.studio_profiles.findMany({
            where: { user_id: user.id },
            select: { id: true },
          });

          const studioIds = studioProfiles.map(s => s.id);

          // 5. Delete studio-related data
          if (studioIds.length > 0) {
            // Delete studio types
            const typesDeleted = await tx.studio_studio_types.deleteMany({
              where: { studio_id: { in: studioIds } },
            });
            if (typesDeleted.count > 0) {
              console.log(`  ✓ Deleted ${typesDeleted.count} studio type(s)`);
            }

            // Delete studio images
            const imagesDeleted = await tx.studio_images.deleteMany({
              where: { studio_id: { in: studioIds } },
            });
            if (imagesDeleted.count > 0) {
              console.log(`  ✓ Deleted ${imagesDeleted.count} studio image(s)`);
            }

            // Delete studio profiles
            const profilesDeleted = await tx.studio_profiles.deleteMany({
              where: { id: { in: studioIds } },
            });
            console.log(`  ✓ Deleted ${profilesDeleted.count} studio profile(s)`);
          }

          // 6. Finally, delete the user
          await tx.users.delete({
            where: { id: user.id },
          });
          console.log(`  ✓ Deleted user account\n`);
        });

        deletedCount++;
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error deleting ${user.email}:`, error instanceof Error ? error.message : error);
        console.log('');
      }
    }

    console.log('\n' + '═'.repeat(100));
    console.log('✅ Deletion Complete!');
    console.log(`   Successfully deleted: ${deletedCount} users`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} users`);
    }
    console.log('═'.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

deleteAllPendingUsers();


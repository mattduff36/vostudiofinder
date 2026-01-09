import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function deleteMattProfile() {
  const email = 'matt.mpdee@gmail.com';
  
  console.log(`\n🔍 Searching for all profile and user data for: ${email}\n`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Find all users with this email (case-insensitive)
    const users = await prisma.users.findMany({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        studio_profiles: {
          include: {
            studio_images: true,
            studio_services: true,
            studio_studio_types: true,
          },
        },
        payments: true,
        subscriptions: true,
        accounts: true,
        sessions: true,
      },
    });

    if (users.length === 0) {
      console.log('⚠️  No users found with exact email. Checking for similar emails...\n');
      
      // Try case-insensitive search with raw SQL
      const similarUsers = await prisma.$queryRaw<Array<{
        id: string;
        email: string;
        username: string;
        display_name: string;
        status: string;
      }>>`
        SELECT id, email, username, display_name, status
        FROM users
        WHERE LOWER(email) LIKE LOWER(${'%' + email.split('@')[0] + '%'})
        LIMIT 10
      `;
      
      if (similarUsers.length > 0) {
        console.log(`Found ${similarUsers.length} user(s) with similar email:\n`);
        similarUsers.forEach((u, index) => {
          console.log(`${index + 1}. Email: ${u.email}, Username: ${u.username}, ID: ${u.id}, Status: ${u.status}`);
        });
        console.log('\n⚠️  Please verify the exact email address.\n');
      } else {
        console.log('✅ No users found with that email address.\n');
      }
      return;
    }

    console.log(`⚠️  Found ${users.length} user account(s) with email ${email}:\n`);

    // Display what will be deleted
    users.forEach((user, index) => {
      console.log(`Account ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Display Name: ${user.display_name}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Has Studio Profile: ${user.studio_profiles ? 'Yes' : 'No'}`);
      if (user.studio_profiles) {
        console.log(`    - Studio Images: ${user.studio_profiles.studio_images?.length || 0}`);
        console.log(`    - Studio Services: ${user.studio_profiles.studio_services?.length || 0}`);
        console.log(`    - Studio Types: ${user.studio_profiles.studio_studio_types?.length || 0}`);
      }
      console.log(`  Payment Records: ${user.payments.length}`);
      console.log(`  Subscriptions: ${user.subscriptions.length}`);
      console.log(`  OAuth Accounts: ${user.accounts.length}`);
      console.log(`  Sessions: ${user.sessions.length}`);
      console.log(`  Created: ${user.created_at.toISOString()}`);
      console.log();
    });

    console.log('🗑️  Starting deletion process...\n');

    // Delete each user and all related data
    for (const user of users) {
      console.log(`\n🗑️  Deleting user: ${user.email} (${user.id})...\n`);

      await prisma.$transaction(async (tx) => {
        const userId = user.id;

        // 1. Delete studio profile and all related studio data
        const studio = await tx.studio_profiles.findUnique({
          where: { user_id: userId },
          select: { id: true },
        });

        if (studio) {
          console.log('  📸 Deleting studio profile data...');
          
          // Delete reviews for this studio
          const reviewsDeleted = await tx.reviews.deleteMany({
            where: {
              OR: [
                { reviewer_id: userId },
                { studio_id: studio.id },
              ],
            },
          });
          console.log(`    ✅ Deleted ${reviewsDeleted.count} review(s)`);

          // Delete studio images
          const imagesDeleted = await tx.studio_images.deleteMany({
            where: { studio_id: studio.id },
          });
          console.log(`    ✅ Deleted ${imagesDeleted.count} studio image(s)`);

          // Delete studio services
          const servicesDeleted = await tx.studio_services.deleteMany({
            where: { studio_id: studio.id },
          });
          console.log(`    ✅ Deleted ${servicesDeleted.count} studio service(s)`);

          // Delete studio types
          const typesDeleted = await tx.studio_studio_types.deleteMany({
            where: { studio_id: studio.id },
          });
          console.log(`    ✅ Deleted ${typesDeleted.count} studio type(s)`);

          // Delete studio profile
          await tx.studio_profiles.delete({
            where: { id: studio.id },
          });
          console.log(`    ✅ Deleted studio profile`);
        }

        // 2. Delete user-related data
        console.log('  👤 Deleting user-related data...');

        // Get payment IDs for refund deletion
        const paymentIds = (
          await tx.payments.findMany({
            where: { user_id: userId },
            select: { id: true },
          })
        ).map((p) => p.id);

        // Delete refunds
        if (paymentIds.length > 0) {
          const refundsDeleted = await tx.refunds.deleteMany({
            where: {
              OR: [
                { user_id: userId },
                { payment_id: { in: paymentIds } },
              ],
            },
          });
          console.log(`    ✅ Deleted ${refundsDeleted.count} refund(s)`);
        }

        // Delete payments
        const paymentsDeleted = await tx.payments.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${paymentsDeleted.count} payment(s)`);

        // Delete subscriptions
        const subscriptionsDeleted = await tx.subscriptions.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${subscriptionsDeleted.count} subscription(s)`);

        // Delete pending subscriptions
        const pendingSubsDeleted = await tx.pending_subscriptions.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${pendingSubsDeleted.count} pending subscription(s)`);

        // Delete messages
        const messagesDeleted = await tx.messages.deleteMany({
          where: {
            OR: [{ sender_id: userId }, { receiver_id: userId }],
          },
        });
        console.log(`    ✅ Deleted ${messagesDeleted.count} message(s)`);

        // Delete user connections
        const connectionsDeleted = await tx.user_connections.deleteMany({
          where: {
            OR: [{ user_id: userId }, { connected_user_id: userId }],
          },
        });
        console.log(`    ✅ Deleted ${connectionsDeleted.count} connection(s)`);

        // Delete notifications
        const notificationsDeleted = await tx.notifications.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${notificationsDeleted.count} notification(s)`);

        // Delete content reports
        const reportsDeleted = await tx.content_reports.deleteMany({
          where: {
            OR: [
              { reporter_id: userId },
              { reported_user_id: userId },
              { reviewed_by_id: userId },
            ],
          },
        });
        console.log(`    ✅ Deleted ${reportsDeleted.count} content report(s)`);

        // Delete user metadata
        const metadataDeleted = await tx.user_metadata.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${metadataDeleted.count} metadata record(s)`);

        // Delete sessions
        const sessionsDeleted = await tx.sessions.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${sessionsDeleted.count} session(s)`);

        // Delete OAuth accounts
        const accountsDeleted = await tx.accounts.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${accountsDeleted.count} OAuth account(s)`);

        // Delete review responses
        const reviewResponsesDeleted = await tx.review_responses.deleteMany({
          where: { author_id: userId },
        });
        console.log(`    ✅ Deleted ${reviewResponsesDeleted.count} review response(s)`);

        // Delete saved searches
        const savedSearchesDeleted = await tx.saved_searches.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${savedSearchesDeleted.count} saved search(es)`);

        // Delete support tickets
        const supportTicketsDeleted = await tx.support_tickets.deleteMany({
          where: { user_id: userId },
        });
        console.log(`    ✅ Deleted ${supportTicketsDeleted.count} support ticket(s)`);

        // Delete waitlist entries (by email)
        const waitlistEntriesDeleted = await tx.waitlist.deleteMany({
          where: {
            email: {
              equals: user.email,
              mode: 'insensitive',
            },
          },
        });
        console.log(`    ✅ Deleted ${waitlistEntriesDeleted.count} waitlist entr(ies)`);

        // 3. Finally, delete the user
        await tx.users.delete({
          where: { id: userId },
        });
        console.log(`    ✅ Deleted user account`);
      });

      console.log(`\n✅ Successfully deleted all data for: ${user.email}\n`);
    }

    console.log('✨ Deletion complete! All profile and user data has been removed.\n');
  } catch (error) {
    console.error('❌ Error during deletion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteMattProfile()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


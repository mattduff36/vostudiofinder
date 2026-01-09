import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Email pattern to identify dummy data
const DUMMY_EMAIL_PATTERN = 'dummy.test';

async function deleteDummyData() {
  console.log('🗑️  Starting dummy data deletion...\n');
  console.log(`🔍 Searching for data with email pattern: ${DUMMY_EMAIL_PATTERN}.*@example.com\n`);

  try {
    // Find all dummy users
    const dummyUsers = await prisma.users.findMany({
      where: {
        email: {
          contains: DUMMY_EMAIL_PATTERN,
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (dummyUsers.length === 0) {
      console.log('✅ No dummy users found. Nothing to delete.');
      await prisma.$disconnect();
      return;
    }

    console.log(`📊 Found ${dummyUsers.length} dummy users to delete\n`);

    const userIds = dummyUsers.map(u => u.id);

    // Delete in transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      let deletedCount = 0;

      // 1. Delete refunds
      const refunds = await tx.refunds.deleteMany({
        where: {
          OR: [
            { user_id: { in: userIds } },
            { payment_id: { in: await tx.payments.findMany({ where: { user_id: { in: userIds } }, select: { id: true } }).then(p => p.map(p => p.id)) } },
          ],
        },
      });
      deletedCount += refunds.count;
      console.log(`  ✅ Deleted ${refunds.count} refunds`);

      // 2. Delete payments
      const payments = await tx.payments.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += payments.count;
      console.log(`  ✅ Deleted ${payments.count} payments`);

      // 3. Delete support tickets
      const supportTickets = await tx.support_tickets.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += supportTickets.count;
      console.log(`  ✅ Deleted ${supportTickets.count} support tickets`);

      // 4. Delete waitlist entries (by email pattern)
      const waitlistEntries = await tx.waitlist.deleteMany({
        where: {
          email: {
            contains: DUMMY_EMAIL_PATTERN,
          },
        },
      });
      deletedCount += waitlistEntries.count;
      console.log(`  ✅ Deleted ${waitlistEntries.count} waitlist entries`);

      // 5. Delete review responses
      const reviewResponses = await tx.review_responses.deleteMany({
        where: { author_id: { in: userIds } },
      });
      deletedCount += reviewResponses.count;
      console.log(`  ✅ Deleted ${reviewResponses.count} review responses`);

      // 6. Delete reviews
      const reviews = await tx.reviews.deleteMany({
        where: {
          OR: [
            { reviewer_id: { in: userIds } },
            { owner_id: { in: userIds } },
          ],
        },
      });
      deletedCount += reviews.count;
      console.log(`  ✅ Deleted ${reviews.count} reviews`);

      // 7. Delete content reports
      const contentReports = await tx.content_reports.deleteMany({
        where: {
          OR: [
            { reporter_id: { in: userIds } },
            { reported_user_id: { in: userIds } },
            { reviewed_by_id: { in: userIds } },
          ],
        },
      });
      deletedCount += contentReports.count;
      console.log(`  ✅ Deleted ${contentReports.count} content reports`);

      // 8. Delete messages
      const messages = await tx.messages.deleteMany({
        where: {
          OR: [
            { sender_id: { in: userIds } },
            { receiver_id: { in: userIds } },
          ],
        },
      });
      deletedCount += messages.count;
      console.log(`  ✅ Deleted ${messages.count} messages`);

      // 9. Delete user connections
      const userConnections = await tx.user_connections.deleteMany({
        where: {
          OR: [
            { user_id: { in: userIds } },
            { connected_user_id: { in: userIds } },
          ],
        },
      });
      deletedCount += userConnections.count;
      console.log(`  ✅ Deleted ${userConnections.count} user connections`);

      // 10. Delete notifications
      const notifications = await tx.notifications.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += notifications.count;
      console.log(`  ✅ Deleted ${notifications.count} notifications`);

      // 11. Delete subscriptions
      const subscriptions = await tx.subscriptions.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += subscriptions.count;
      console.log(`  ✅ Deleted ${subscriptions.count} subscriptions`);

      // 12. Delete pending subscriptions
      const pendingSubscriptions = await tx.pending_subscriptions.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += pendingSubscriptions.count;
      console.log(`  ✅ Deleted ${pendingSubscriptions.count} pending subscriptions`);

      // 13. Delete saved searches
      const savedSearches = await tx.saved_searches.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += savedSearches.count;
      console.log(`  ✅ Deleted ${savedSearches.count} saved searches`);

      // 14. Delete accounts
      const accounts = await tx.accounts.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += accounts.count;
      console.log(`  ✅ Deleted ${accounts.count} accounts`);

      // 15. Delete sessions
      const sessions = await tx.sessions.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += sessions.count;
      console.log(`  ✅ Deleted ${sessions.count} sessions`);

      // 16. Delete user metadata
      const userMetadata = await tx.user_metadata.deleteMany({
        where: { user_id: { in: userIds } },
      });
      deletedCount += userMetadata.count;
      console.log(`  ✅ Deleted ${userMetadata.count} user metadata entries`);

      // 17. Get studio profiles before deleting
      const studioProfiles = await tx.studio_profiles.findMany({
        where: { user_id: { in: userIds } },
        select: { id: true },
      });
      const studioIds = studioProfiles.map(s => s.id);

      // 18. Delete studio-related data
      if (studioIds.length > 0) {
        const studioServices = await tx.studio_services.deleteMany({
          where: { studio_id: { in: studioIds } },
        });
        deletedCount += studioServices.count;
        console.log(`  ✅ Deleted ${studioServices.count} studio services`);

        const studioTypes = await tx.studio_studio_types.deleteMany({
          where: { studio_id: { in: studioIds } },
        });
        deletedCount += studioTypes.count;
        console.log(`  ✅ Deleted ${studioTypes.count} studio types`);

        const studioImages = await tx.studio_images.deleteMany({
          where: { studio_id: { in: studioIds } },
        });
        deletedCount += studioImages.count;
        console.log(`  ✅ Deleted ${studioImages.count} studio images`);

        const studios = await tx.studio_profiles.deleteMany({
          where: { id: { in: studioIds } },
        });
        deletedCount += studios.count;
        console.log(`  ✅ Deleted ${studios.count} studio profiles`);
      }

      // 19. Finally, delete users
      const users = await tx.users.deleteMany({
        where: { id: { in: userIds } },
      });
      deletedCount += users.count;
      console.log(`  ✅ Deleted ${users.count} users`);

      console.log(`\n📊 Total records deleted: ${deletedCount}`);
    });

    console.log(`\n✨ Dummy data deletion complete!`);

  } catch (error) {
    console.error('❌ Error deleting dummy data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteDummyData()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


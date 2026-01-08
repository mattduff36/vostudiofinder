import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function findAndDeleteAccount() {
  const email = 'matt.mpdee@gmail.com';
  const username = 'Matt';
  
  console.log(`\n🔍 Searching for account...\n`);
  console.log(`Email: ${email}`);
  console.log(`Username: ${username}`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Try finding by email
    let user = await prisma.users.findUnique({
      where: { email: email },
      include: {
        studio_profiles: true,
        payments: true,
        subscriptions: true,
        accounts: true
      }
    });

    // If not found by email, try by username
    if (!user) {
      console.log('Not found by email, trying username...\n');
      user = await prisma.users.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          }
        },
        include: {
          studio_profiles: true,
          payments: true,
          subscriptions: true,
          accounts: true
        }
      });
    }

    // If still not found, list all users with similar emails/usernames
    if (!user) {
      console.log('Not found by username either. Searching for similar...\n');
      const similarUsers = await prisma.users.findMany({
        where: {
          OR: [
            { email: { contains: 'matt.mpdee', mode: 'insensitive' } },
            { username: { contains: 'Matt', mode: 'insensitive' } }
          ]
        },
        include: {
          studio_profiles: true
        },
        take: 10
      });

      if (similarUsers.length > 0) {
        console.log(`Found ${similarUsers.length} similar user(s):\n`);
        similarUsers.forEach((u, index) => {
          console.log(`${index + 1}. Email: ${u.email}, Username: ${u.username}, ID: ${u.id}`);
          console.log(`   Studio: ${u.studio_profiles?.name || 'None'}\n`);
        });
        user = similarUsers[0]; // Use first match
      }
    }

    if (!user) {
      console.log('❌ No user found with that email or username.\n');
      return;
    }

    console.log(`✅ Found user:\n`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Display Name: ${user.display_name}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Studio Profile: ${user.studio_profiles ? `Yes - "${user.studio_profiles.name}"` : 'No'}`);
    console.log(`  Payments: ${user.payments.length}`);
    console.log(`  Subscriptions: ${user.subscriptions.length}`);
    console.log(`  OAuth Accounts: ${user.accounts.length}\n`);

    console.log('🗑️  Deleting account and all related data...\n');

    // Use transaction to ensure all data is deleted atomically
    await prisma.$transaction(async (tx) => {
      const userId = user!.id;
      
      // 1. Delete studio-related data
      if (user!.studio_profiles) {
        const studioId = user!.studio_profiles.id;
        console.log(`  Deleting studio profile "${user!.studio_profiles.name}" and related data...`);
        
        // Delete studio services
        const servicesDeleted = await tx.studio_services.deleteMany({
          where: { studio_id: studioId }
        });
        console.log(`    ✅ Deleted ${servicesDeleted.count} studio service(s)`);
        
        // Delete studio types
        const typesDeleted = await tx.studio_studio_types.deleteMany({
          where: { studio_id: studioId }
        });
        console.log(`    ✅ Deleted ${typesDeleted.count} studio type(s)`);
        
        // Delete studio images
        const imagesDeleted = await tx.studio_images.deleteMany({
          where: { studio_id: studioId }
        });
        console.log(`    ✅ Deleted ${imagesDeleted.count} studio image(s)`);
        
        // Delete reviews (as reviewer or owner)
        const reviewsDeleted = await tx.reviews.deleteMany({
          where: {
            OR: [
              { reviewer_id: userId },
              { studio_id: studioId }
            ]
          }
        });
        console.log(`    ✅ Deleted ${reviewsDeleted.count} review(s)`);
        
        // Delete studio profile
        await tx.studio_profiles.delete({
          where: { id: studioId }
        });
        console.log(`    ✅ Deleted studio profile`);
      }
      
      // 2. Delete messages
      const messagesDeleted = await tx.messages.deleteMany({
        where: {
          OR: [
            { sender_id: userId },
            { receiver_id: userId }
          ]
        }
      });
      console.log(`  ✅ Deleted ${messagesDeleted.count} message(s)`);
      
      // 3. Delete user connections
      const connectionsDeleted = await tx.user_connections.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { connected_user_id: userId }
          ]
        }
      });
      console.log(`  ✅ Deleted ${connectionsDeleted.count} connection(s)`);
      
      // 4. Delete refunds
      const userPayments = await tx.payments.findMany({
        where: { user_id: userId },
        select: { id: true },
      });
      const paymentIds = userPayments.map(p => p.id);
      
      const refundsDeleted = await tx.refunds.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { payment_id: { in: paymentIds } }
          ]
        }
      });
      console.log(`  ✅ Deleted ${refundsDeleted.count} refund(s)`);
      
      // 5. Delete payments
      const paymentsDeleted = await tx.payments.deleteMany({
        where: { user_id: userId }
      });
      console.log(`  ✅ Deleted ${paymentsDeleted.count} payment record(s)`);
      
      // 6. Delete subscriptions
      const subscriptionsDeleted = await tx.subscriptions.deleteMany({
        where: { user_id: userId }
      });
      console.log(`  ✅ Deleted ${subscriptionsDeleted.count} subscription(s)`);
      
      // 7. Delete auth-related data
      const sessionsDeleted = await tx.sessions.deleteMany({
        where: { user_id: userId }
      });
      console.log(`  ✅ Deleted ${sessionsDeleted.count} session(s)`);
      
      const accountsDeleted = await tx.accounts.deleteMany({
        where: { user_id: userId }
      });
      console.log(`  ✅ Deleted ${accountsDeleted.count} OAuth account(s)`);
      
      // 8. Delete user metadata
      const metadataDeleted = await tx.user_metadata.deleteMany({
        where: { user_id: userId }
      });
      console.log(`  ✅ Deleted ${metadataDeleted.count} metadata record(s)`);
      
      // 9. Finally, delete the user
      await tx.users.delete({
        where: { id: userId }
      });
      console.log(`  ✅ Deleted user account`);
    });

    console.log(`\n✅ Successfully deleted account: ${user.email} (${user.username})\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
findAndDeleteAccount()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


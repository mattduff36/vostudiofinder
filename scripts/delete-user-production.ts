import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env.production
dotenv.config({ path: '.env.production' });

const prisma = new PrismaClient();

async function deleteUserByEmail() {
  const email = 'matt.mpdee@gmail.com';
  
  console.log(`\n🔍 Searching for accounts with email: ${email}\n`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Find all users with the test email
    const users = await prisma.users.findMany({
      where: {
        email: email
      },
      include: {
        studio_profiles: true,
        payments: true,
        subscriptions: true,
        accounts: true
      }
    });

    if (users.length === 0) {
      console.log('✅ No accounts found with that email.\n');
      return;
    }

    console.log(`⚠️  Found ${users.length} account(s) with email ${email}:\n`);

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
      
      // Use transaction to ensure all data is deleted atomically
      await prisma.$transaction(async (tx) => {
        // 1. Delete studio-related data
        if (user.studio_profiles) {
          const studioId = user.studio_profiles.id;
          console.log(`  Deleting studio profile and related data...`);
          
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
                { reviewer_id: user.id },
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
              { sender_id: user.id },
              { receiver_id: user.id }
            ]
          }
        });
        console.log(`  ✅ Deleted ${messagesDeleted.count} message(s)`);
        
        // 3. Delete user connections
        const connectionsDeleted = await tx.user_connections.deleteMany({
          where: {
            OR: [
              { user_id: user.id },
              { connected_user_id: user.id }
            ]
          }
        });
        console.log(`  ✅ Deleted ${connectionsDeleted.count} connection(s)`);
        
        // 4. Delete refunds (check both user_id and payment_id)
        // First, get all payment IDs for this user
        const userPayments = await tx.payments.findMany({
          where: { user_id: user.id },
          select: { id: true },
        });
        const paymentIds = userPayments.map(p => p.id);
        
        // Delete refunds linked to these payments OR directly to the user
        const refundsDeleted = await tx.refunds.deleteMany({
          where: {
            OR: [
              { user_id: user.id },
              { payment_id: { in: paymentIds } }
            ]
          }
        });
        console.log(`  ✅ Deleted ${refundsDeleted.count} refund(s)`);
        
        // 5. Delete payments
        const paymentsDeleted = await tx.payments.deleteMany({
          where: { user_id: user.id }
        });
        console.log(`  ✅ Deleted ${paymentsDeleted.count} payment record(s)`);
        
        // 6. Delete subscriptions
        const subscriptionsDeleted = await tx.subscriptions.deleteMany({
          where: { user_id: user.id }
        });
        console.log(`  ✅ Deleted ${subscriptionsDeleted.count} subscription(s)`);
        
        // 7. Delete auth-related data
        const sessionsDeleted = await tx.sessions.deleteMany({
          where: { user_id: user.id }
        });
        console.log(`  ✅ Deleted ${sessionsDeleted.count} session(s)`);
        
        const accountsDeleted = await tx.accounts.deleteMany({
          where: { user_id: user.id }
        });
        console.log(`  ✅ Deleted ${accountsDeleted.count} OAuth account(s)`);
        
        // 8. Delete user metadata
        const metadataDeleted = await tx.user_metadata.deleteMany({
          where: { user_id: user.id }
        });
        console.log(`  ✅ Deleted ${metadataDeleted.count} metadata record(s)`);
        
        // 9. Finally, delete the user
        await tx.users.delete({
          where: { id: user.id }
        });
        console.log(`  ✅ Deleted user account`);
      });
      
      console.log(`✅ Successfully deleted: ${user.username}\n`);
    }

    console.log(`✅ Successfully deleted ${users.length} account(s).\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteUserByEmail()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


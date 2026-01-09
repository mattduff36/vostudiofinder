import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function findByStudioName() {
  const studioName = 'Matt Studios 1';
  const email = 'matt.mpdee@gmail.com';
  
  console.log(`\n🔍 Searching for studio: "${studioName}"\n`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Find studio by name
    const studio = await prisma.studio_profiles.findFirst({
      where: {
        name: {
          contains: studioName,
          mode: 'insensitive',
        }
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            status: true,
          }
        }
      }
    });

    if (!studio) {
      console.log('❌ Studio not found. Searching all studios with "Matt" in name...\n');
      
      const allMattStudios = await prisma.studio_profiles.findMany({
        where: {
          name: {
            contains: 'Matt',
            mode: 'insensitive',
          }
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              status: true,
            }
          }
        },
        take: 10
      });

      if (allMattStudios.length > 0) {
        console.log(`Found ${allMattStudios.length} studio(s) with "Matt" in name:\n`);
        allMattStudios.forEach((s, index) => {
          console.log(`${index + 1}. "${s.name}"`);
          console.log(`   Owner: ${s.users.email} (${s.users.username})`);
          console.log(`   User ID: ${s.users.id}\n`);
        });
      } else {
        console.log('❌ No studios found with "Matt" in name.\n');
      }
      return;
    }

    const user = studio.users;
    
    console.log(`✅ Found studio and user:\n`);
    console.log(`  Studio ID: ${studio.id}`);
    console.log(`  Studio Name: ${studio.name}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Display Name: ${user.display_name}`);
    console.log(`  Status: ${user.status}\n`);

    // Verify email matches
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      console.log(`⚠️  Warning: Email doesn't match exactly!`);
      console.log(`   Expected: ${email}`);
      console.log(`   Found: ${user.email}\n`);
    }

    console.log('🗑️  Deleting account and all related data...\n');

    // Use transaction to ensure all data is deleted atomically
    await prisma.$transaction(async (tx) => {
      const userId = user.id;
      const studioId = studio.id;
      
      // 1. Delete studio-related data
      console.log(`  Deleting studio profile "${studio.name}" and related data...`);
      
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
findByStudioName()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


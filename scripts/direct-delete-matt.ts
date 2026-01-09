import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function directDelete() {
  console.log(`\n🔍 Direct search and delete for matt.mpdee@gmail.com\n`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Use raw SQL to find the user - this bypasses any Prisma issues
    const users = await prisma.$queryRaw<Array<{
      id: string;
      email: string;
      username: string;
      display_name: string;
      status: string;
    }>>`
      SELECT id, email, username, display_name, status
      FROM users
      WHERE LOWER(email) = LOWER('matt.mpdee@gmail.com')
         OR LOWER(username) = LOWER('Matt')
    `;

    if (users.length === 0) {
      console.log('❌ No user found. Listing all users with "matt" in email or username...\n');
      
      const allMattUsers = await prisma.$queryRaw<Array<{
        id: string;
        email: string;
        username: string;
        display_name: string;
        status: string;
      }>>`
        SELECT id, email, username, display_name, status
        FROM users
        WHERE LOWER(email) LIKE LOWER('%matt%')
           OR LOWER(username) LIKE LOWER('%matt%')
        LIMIT 20
      `;

      if (allMattUsers.length > 0) {
        console.log(`Found ${allMattUsers.length} user(s):\n`);
        allMattUsers.forEach((u, index) => {
          console.log(`${index + 1}. Email: ${u.email}, Username: ${u.username}, ID: ${u.id}, Status: ${u.status}`);
        });
      }
      return;
    }

    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach((u, index) => {
      console.log(`${index + 1}. Email: ${u.email}, Username: ${u.username}, ID: ${u.id}, Status: ${u.status}`);
    });

    // Delete each user found
    for (const user of users) {
      console.log(`\n🗑️  Deleting user: ${user.email} (${user.id})...\n`);

      await prisma.$transaction(async (tx) => {
        const userId = user.id;

        // Get studio profile if exists
        const studio = await tx.studio_profiles.findUnique({
          where: { user_id: userId },
          select: { id: true }
        });

        if (studio) {
          // Delete studio-related data
          await tx.studio_services.deleteMany({ where: { studio_id: studio.id } });
          await tx.studio_studio_types.deleteMany({ where: { studio_id: studio.id } });
          await tx.studio_images.deleteMany({ where: { studio_id: studio.id } });
          await tx.reviews.deleteMany({
            where: {
              OR: [
                { reviewer_id: userId },
                { studio_id: studio.id }
              ]
            }
          });
          await tx.studio_profiles.delete({ where: { id: studio.id } });
          console.log(`  ✅ Deleted studio profile`);
        }

        // Delete all related data
        await tx.messages.deleteMany({
          where: { OR: [{ sender_id: userId }, { receiver_id: userId }] }
        });
        await tx.user_connections.deleteMany({
          where: { OR: [{ user_id: userId }, { connected_user_id: userId }] }
        });
        
        const paymentIds = (await tx.payments.findMany({
          where: { user_id: userId },
          select: { id: true }
        })).map(p => p.id);
        
        await tx.refunds.deleteMany({
          where: {
            OR: [
              { user_id: userId },
              { payment_id: { in: paymentIds } }
            ]
          }
        });
        await tx.payments.deleteMany({ where: { user_id: userId } });
        await tx.subscriptions.deleteMany({ where: { user_id: userId } });
        await tx.sessions.deleteMany({ where: { user_id: userId } });
        await tx.accounts.deleteMany({ where: { user_id: userId } });
        await tx.user_metadata.deleteMany({ where: { user_id: userId } });
        
        // Finally delete user
        await tx.users.delete({ where: { id: userId } });
        console.log(`  ✅ Deleted user account`);
      });

      console.log(`✅ Successfully deleted: ${user.email}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

directDelete()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


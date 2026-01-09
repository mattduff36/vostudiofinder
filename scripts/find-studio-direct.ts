import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function findStudioDirect() {
  console.log(`\n🔍 Direct search for "Matt Studios 1"\n`);
  console.log(`Database: ${process.env.DATABASE_URL?.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1****$3')}\n`);

  try {
    // Query studio_profiles directly
    const studios = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      user_id: string;
      status: string;
      email: string;
      username: string;
    }>>`
      SELECT 
        sp.id,
        sp.name,
        sp.user_id,
        sp.status,
        u.email,
        u.username
      FROM studio_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE LOWER(sp.name) LIKE LOWER('%Matt Studios 1%')
         OR LOWER(u.email) = LOWER('matt.mpdee@gmail.com')
         OR LOWER(u.username) = LOWER('Matt')
    `;

    if (studios.length === 0) {
      console.log('❌ Not found. Searching all studios with "Matt" in name...\n');
      
      const allMatt = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        user_id: string;
        email: string;
        username: string;
      }>>`
        SELECT 
          sp.id,
          sp.name,
          sp.user_id,
          u.email,
          u.username
        FROM studio_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE LOWER(sp.name) LIKE LOWER('%Matt%')
           OR LOWER(u.email) LIKE LOWER('%matt.mpdee%')
        LIMIT 10
      `;

      if (allMatt.length > 0) {
        console.log(`Found ${allMatt.length} studio(s):\n`);
        allMatt.forEach((s, index) => {
          console.log(`${index + 1}. Studio: "${s.name}"`);
          console.log(`   Owner: ${s.email} (${s.username})`);
          console.log(`   Studio ID: ${s.id}, User ID: ${s.user_id}\n`);
        });
      } else {
        console.log('❌ No studios found.\n');
      }
      return;
    }

    console.log(`✅ Found ${studios.length} studio(s):\n`);
    studios.forEach((studio, index) => {
      console.log(`${index + 1}. Studio: "${studio.name}"`);
      console.log(`   Owner: ${studio.email} (${studio.username})`);
      console.log(`   Studio ID: ${studio.id}`);
      console.log(`   User ID: ${studio.user_id}`);
      console.log(`   Status: ${studio.status}\n`);
    });

    // Delete each found studio/user
    for (const studio of studios) {
      console.log(`🗑️  Deleting studio "${studio.name}" and user ${studio.email}...\n`);

      await prisma.$transaction(async (tx) => {
        const userId = studio.user_id;
        const studioId = studio.id;

        // Delete studio-related data
        await tx.studio_services.deleteMany({ where: { studio_id: studioId } });
        await tx.studio_studio_types.deleteMany({ where: { studio_id: studioId } });
        await tx.studio_images.deleteMany({ where: { studio_id: studioId } });
        await tx.reviews.deleteMany({
          where: {
            OR: [
              { reviewer_id: userId },
              { studio_id: studioId }
            ]
          }
        });
        await tx.studio_profiles.delete({ where: { id: studioId } });
        console.log(`  ✅ Deleted studio profile`);

        // Delete user-related data
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

      console.log(`✅ Successfully deleted: ${studio.email}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findStudioDirect()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


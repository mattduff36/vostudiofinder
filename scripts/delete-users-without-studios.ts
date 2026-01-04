/**
 * Delete users without studios
 * 
 * ⚠️ WARNING: This permanently deletes users from the database
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Get database target from command line args
const target = process.argv[2]?.toLowerCase();
const confirmFlag = process.argv[3] === '--confirm';

if (!target || !['dev', 'production'].includes(target)) {
  console.error('\n❌ ERROR: Please specify target database');
  console.error('Usage: npx tsx scripts/delete-users-without-studios.ts [dev|production] --confirm\n');
  process.exit(1);
}

// Load appropriate environment
const envFile = target === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  try {
    const dbName = target.toUpperCase();
    
    console.log(`\n=== DELETE USERS WITHOUT STUDIOS (${dbName}) ===\n`);

    // Get users without studios
    const users = await db.users.findMany({
      where: {
        studio_profiles: null
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (users.length === 0) {
      console.log(`✅ No users without studios found in ${dbName}`);
      return;
    }

    console.log(`Found ${users.length} users without studios:\n`);
    
    // Show list
    console.log('ID'.padEnd(38) + 'Email'.padEnd(35) + 'Display Name'.padEnd(25) + 'Role');
    console.log('-'.repeat(110));
    
    users.forEach(user => {
      const id = user.id.substring(0, 36).padEnd(38);
      const email = (user.email || 'N/A').substring(0, 33).padEnd(35);
      const name = (user.display_name || user.username || 'N/A').substring(0, 23).padEnd(25);
      const role = (user.role || 'N/A');
      
      console.log(`${id}${email}${name}${role}`);
    });

    console.log('\n⚠️  WARNING: This will PERMANENTLY DELETE these users from the database!');
    console.log(`⚠️  Database: ${dbName}`);
    console.log(`⚠️  Users to delete: ${users.length}\n`);

    // Check for confirmation flag
    if (!confirmFlag) {
      console.error('❌ ERROR: --confirm flag required to proceed');
      console.error(`\nTo delete these ${users.length} users, run:`);
      console.error(`npx tsx scripts/delete-users-without-studios.ts ${target} --confirm\n`);
      process.exit(1);
    }

    console.log('✓ Confirmation flag detected, proceeding with deletion...');

    console.log('\n🗑️  Deleting users...\n');

    // Delete users (with user_connections cleanup)
    let deleted = 0;
    for (const user of users) {
      try {
        // First, delete any user_connections records
        await db.user_connections.deleteMany({
          where: {
            OR: [
              { user_id: user.id },
              { connected_user_id: user.id }
            ]
          }
        });
        
        // Then delete the user
        await db.users.delete({
          where: { id: user.id }
        });
        deleted++;
        console.log(`  ✓ Deleted: ${user.display_name || user.username} (${user.email})`);
      } catch (error) {
        console.error(`  ✗ Failed to delete ${user.email}:`, error);
      }
    }

    console.log(`\n✅ Deletion complete!`);
    console.log(`   Database: ${dbName}`);
    console.log(`   Users deleted: ${deleted}/${users.length}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main().catch(console.error);


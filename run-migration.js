// Simple migration script - run with: node run-migration.js
import { createClient } from '@libsql/client';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

// Turso client setup
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

console.log('Turso URL:', process.env.TURSO_DATABASE_URL ? 'Set' : 'Missing');
console.log('Turso Token:', process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Missing');

async function fetchTurso(query) {
  const result = await turso.execute(query);
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

async function runMigration() {
  console.log('🚀 Starting Migration...');
  
  try {
    // Step 1: Get users from Turso
    console.log('1. Fetching users from Turso...');
    const tursoUsers = await fetchTurso('SELECT * FROM users LIMIT 10');
    console.log(`   Found ${tursoUsers.length} users (limited to 10 for testing)`);
    
    // Step 2: Migrate users
    console.log('2. Migrating users...');
    let userCount = 0;
    const userIdMap = new Map();
    
    for (const user of tursoUsers) {
      try {
        const newId = createId();
        userIdMap.set(user.id, newId);
        
        await prisma.user.create({
          data: {
            id: newId,
            email: user.email || `user${user.id}@example.com`,
            username: user.username || `user${user.id}`,
            displayName: user.display_name || user.username || `User ${user.id}`,
            role: user.admin === 1 ? 'ADMIN' : 'USER',
            emailVerified: user.verified === 1,
            createdAt: user.created ? new Date(user.created) : new Date(),
            updatedAt: user.updated ? new Date(user.updated) : new Date(),
          }
        });
        userCount++;
        console.log(`   ✅ Migrated user ${userCount}: ${user.email}`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate user ${user.id}: ${error.message}`);
      }
    }
    
    // Step 3: Get profiles from Turso
    console.log('3. Fetching profiles from Turso...');
    const tursoProfiles = await fetchTurso('SELECT * FROM profile WHERE user_id IN (' + tursoUsers.map(u => u.id).join(',') + ')');
    console.log(`   Found ${tursoProfiles.length} profiles`);
    
    // Step 4: Migrate profiles
    console.log('4. Migrating profiles...');
    let profileCount = 0;
    
    for (const profile of tursoProfiles) {
      try {
        const newUserId = userIdMap.get(profile.user_id);
        if (!newUserId) continue;
        
        await prisma.userProfile.create({
          data: {
            id: createId(),
            userId: newUserId,
            firstName: profile.firstname || null,
            lastName: profile.lastname || null,
            phone: profile.phone || null,
            about: profile.about || profile.bio || null,
            location: profile.location || null,
            showRates: profile.show_rates === 1,
            isCrbChecked: profile.crb_checked === 1,
            isFeatured: profile.featured === 1,
            isSpotlight: profile.spotlight === 1,
            verificationLevel: profile.verification_level || 0,
            showEmail: profile.show_email === 1,
            showPhone: profile.show_phone === 1,
            showAddress: profile.show_address === 1,
            createdAt: profile.created ? new Date(profile.created) : new Date(),
            updatedAt: profile.updated ? new Date(profile.updated) : new Date(),
          }
        });
        profileCount++;
        console.log(`   ✅ Migrated profile ${profileCount} for user ${profile.user_id}`);
      } catch (error) {
        console.log(`   ❌ Failed to migrate profile ${profile.id}: ${error.message}`);
      }
    }
    
    // Step 5: Verify results
    console.log('5. Verifying results...');
    const finalUserCount = await prisma.user.count();
    const finalProfileCount = await prisma.userProfile.count();
    
    console.log('\n🎉 MIGRATION COMPLETED!');
    console.log(`   Users migrated: ${userCount}/${tursoUsers.length}`);
    console.log(`   Profiles migrated: ${profileCount}/${tursoProfiles.length}`);
    console.log(`   Final database counts: ${finalUserCount} users, ${finalProfileCount} profiles`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

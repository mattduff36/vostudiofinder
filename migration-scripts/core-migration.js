import { tursoClient, fetchAllTurso } from './utils/turso-client.js';
import { userMapper } from './data-mappers/user-mapper.js';
import { ProfileMapper } from './data-mappers/profile-mapper.js';
import { migrationLogger } from './utils/logger.js';

async function runCoreMigration() {
  console.log('🚀 STARTING CORE DATA MIGRATION (Users & Profiles)...');
  
  try {
    migrationLogger.startPhase('Core Data Migration');
    
    // Step 1: Fetch and analyze legacy users
    console.log('\n1. Fetching legacy users from Turso...');
    const legacyUsers = await fetchAllTurso('SELECT * FROM users ORDER BY id;');
    console.log(`   ✅ Found ${legacyUsers.length} legacy users`);
    
    // Step 2: Clean and map users
    console.log('\n2. Cleaning and mapping user data...');
    const cleanUsers = userMapper.cleanLegacyUserData(legacyUsers);
    const mappedUsers = userMapper.mapUsers(cleanUsers);
    console.log(`   ✅ Mapped ${mappedUsers.length} users (${legacyUsers.length - mappedUsers.length} filtered out)`);
    
    // Step 3: Migrate users to Prisma
    console.log('\n3. Migrating users to Prisma database...');
    await userMapper.migrateUsers(mappedUsers);
    console.log(`   ✅ Successfully migrated ${mappedUsers.length} users`);
    
    // Step 4: Fetch and analyze legacy profiles
    console.log('\n4. Fetching legacy profiles from Turso...');
    const legacyProfiles = await fetchAllTurso('SELECT * FROM profile ORDER BY id;');
    console.log(`   ✅ Found ${legacyProfiles.length} legacy profiles`);
    
    // Step 5: Map and migrate profiles
    console.log('\n5. Mapping and migrating profiles...');
    const profileMapper = new ProfileMapper(userMapper.getIdMappings());
    const cleanProfiles = profileMapper.cleanLegacyProfileData(legacyProfiles);
    const mappedProfiles = profileMapper.mapProfiles(cleanProfiles);
    console.log(`   ✅ Mapped ${mappedProfiles.length} profiles`);
    
    // Get profile statistics
    const profileStats = profileMapper.getProfileStatistics(cleanProfiles);
    console.log('   📊 Profile categories:', profileStats);
    
    // Step 6: Migrate profiles to Prisma
    console.log('\n6. Migrating profiles to Prisma database...');
    await profileMapper.migrateProfiles(mappedProfiles);
    console.log(`   ✅ Successfully migrated ${mappedProfiles.length} profiles`);
    
    // Step 7: Verification
    console.log('\n7. Verifying migration results...');
    const { db } = await import('../src/lib/db.js');
    const userCount = await db.user.count();
    const profileCount = await db.userProfile.count();
    
    console.log(`   📊 Final counts: ${userCount} users, ${profileCount} profiles`);
    
    migrationLogger.completePhase('Core Data Migration', {
      legacyUsers: legacyUsers.length,
      migratedUsers: mappedUsers.length,
      legacyProfiles: legacyProfiles.length,
      migratedProfiles: mappedProfiles.length,
      finalUserCount: userCount,
      finalProfileCount: profileCount,
      profileStats
    });
    
    console.log('\n🎉 CORE DATA MIGRATION COMPLETED SUCCESSFULLY!');
    console.log(`   Users: ${legacyUsers.length} → ${userCount}`);
    console.log(`   Profiles: ${legacyProfiles.length} → ${profileCount}`);
    console.log(`   Profile Categories:`, profileStats);
    
    await db.$disconnect();
    
  } catch (error) {
    migrationLogger.error('Core data migration failed', 'CORE_MIGRATION', { error: error.message });
    console.error('\n❌ CORE MIGRATION FAILED:', error.message);
    throw error;
  }
}

runCoreMigration();

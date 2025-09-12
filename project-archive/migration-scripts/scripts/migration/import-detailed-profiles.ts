import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

// interface UserMeta {
//   user_id: number;
//   meta_key: string;
//   meta_value: string;
// }

// interface ConnectionType {
//   id: string;
//   name: string;
// }

// const connectionTypes: ConnectionType[] = [
//   { id: 'connection1', name: 'ISDN' },
//   { id: 'connection2', name: 'Source Connect' },
//   { id: 'connection3', name: 'Source Connect Now' },
//   { id: 'connection4', name: 'Phone patch' },
//   { id: 'connection5', name: 'Skype' },
//   { id: 'connection6', name: 'Session Link Pro' },
//   { id: 'connection8', name: 'ipDTL' },
//   { id: 'connection11', name: 'Zoom' },
//   { id: 'connection12', name: 'Teams' },
//   { id: 'connection13', name: 'Discord' },
//   { id: 'connection14', name: 'Google Meet' },
//   { id: 'connection15', name: 'FaceTime' },
// ];

const studioTypes: { [key: string]: string } = {
  '1': 'HOME',
  '2': 'RECORDING', 
  '3': 'MOBILE',
  '4': 'PRODUCTION',
  '5': 'PRODUCTION',
  '6': 'HOME'
};

function parseUserMetaFromSQL(sqlContent: string): { [userId: number]: { [key: string]: string } } {
  const userMetaMap: { [userId: number]: { [key: string]: string } } = {};
  
  // Find all usermeta INSERT statements
  const insertPattern = /INSERT INTO `usermeta` VALUES \((.*?)\);/g;
  let match;
  
  while ((match = insertPattern.exec(sqlContent)) !== null) {
    const values = match[1];
    if (!values) continue;
    
    // Parse the values - they're in format: (id,user_id,'meta_key','meta_value'),(id,user_id,'meta_key','meta_value')...
    const valuePattern = /\(\d+,(\d+),'([^']*?)','([^']*?)'\)/g;
    let valueMatch;
    
    while ((valueMatch = valuePattern.exec(values)) !== null) {
      if (!valueMatch[1] || !valueMatch[2] || !valueMatch[3]) continue;
      
      const userId = parseInt(valueMatch[1]);
      const metaKey = valueMatch[2];
      const metaValue = valueMatch[3];
      
      if (!userMetaMap[userId]) {
        userMetaMap[userId] = {};
      }
      userMetaMap[userId][metaKey] = metaValue;
    }
  }
  
  return userMetaMap;
}

async function importDetailedProfiles() {
  try {
    console.log('📖 Reading legacy SQL dump file...');
    const sqlFilePath = path.join(__dirname, '../../..', '_BACKUPS', 'old-site', 'MAIN DATABASE', 'cl59-theshows2.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log('📊 Parsing user metadata from SQL dump...');
    const userMetaMap = parseUserMetaFromSQL(sqlContent);
    
    console.log('📊 Fetching all users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true
      }
    });

    console.log(`Found ${users.length} users to enhance`);

    // Create a map to match users by legacy ID extracted from username
    const usersByLegacyId: { [legacyId: number]: typeof users[0] } = {};
    users.forEach(user => {
      // Extract legacy ID from username pattern: username_1234
      const match = user.username.match(/_(\d+)$/);
      if (match && match[1]) {
        const legacyId = parseInt(match[1]);
        usersByLegacyId[legacyId] = user;
      }
    });

    console.log(`📊 Found ${Object.keys(usersByLegacyId).length} users with legacy IDs to enhance`);

    let processedCount = 0;
    
    // Process each user that has metadata
    for (const [legacyIdStr, meta] of Object.entries(userMetaMap)) {
      const legacyUserId = parseInt(legacyIdStr);
      
      // Find corresponding user in our database
      const currentUser = usersByLegacyId[legacyUserId];
      if (!currentUser) {
        continue; // Skip users we don't have in our database
      }

      console.log(`\n🔍 Processing user: ${currentUser.displayName} (Legacy ID: ${legacyUserId})`);

      if (Object.keys(meta).length === 0) {
        console.log('  ⚠️  No metadata found, skipping...');
        continue;
      }

      // Check if user already has a studio profile
      let studio = await prisma.studio.findFirst({
        where: { ownerId: currentUser.id }
      });

      // Prepare studio data (only using fields that exist in the current schema)
      const studioData = {
        name: currentUser.displayName || currentUser.username,
        description: meta.about || meta.shortabout || `Professional voiceover services by ${currentUser.displayName}`,
        studioType: (meta.homestudio ? studioTypes[meta.homestudio] as any : null) || 'HOME',
        phone: meta.phone || null,
        websiteUrl: meta.url || null,
        
        // Address and location
        address: meta.loc1 || null,
        latitude: meta.loc3 ? parseFloat(meta.loc3) : null,
        longitude: meta.loc4 ? parseFloat(meta.loc4) : null,
        
        // Professional flags (only using fields that exist)
        isVerified: meta.verified === '1',
        
        // Update timestamps
        updatedAt: new Date(),
      };

      if (studio) {
        // Update existing studio
        console.log('  📝 Updating existing studio profile...');
        studio = await prisma.studio.update({
          where: { id: studio.id },
          data: studioData
        });
      } else {
        // Create new studio
        console.log('  ✨ Creating new studio profile...');
        studio = await prisma.studio.create({
          data: {
            ...studioData,
            ownerId: currentUser.id,
          }
        });
      }

      // Process connection services (using actual ServiceType enum)
      const connectionServices = [];
      
      // Map legacy connection fields to ServiceType enum values
      const connectionMapping = {
        'connection1': 'ISDN',
        'connection2': 'SOURCE_CONNECT', 
        'connection3': 'SOURCE_CONNECT_NOW',
        'connection5': 'SKYPE',
        'connection6': 'SESSION_LINK_PRO',
        'connection11': 'ZOOM',
        'connection12': 'TEAMS',
      };

      for (const [legacyKey, serviceType] of Object.entries(connectionMapping)) {
        if (meta[legacyKey] === '1') {
          connectionServices.push({
            studioId: studio.id,
            service: serviceType as any,
          });
        }
      }

      if (connectionServices.length > 0) {
        // Delete existing services first
        await prisma.studioService.deleteMany({
          where: { studioId: studio.id }
        });

        // Add new connection services
        await prisma.studioService.createMany({
          data: connectionServices
        });
        console.log(`  🔗 Added ${connectionServices.length} connection services`);
      }

      console.log(`  ✅ Enhanced profile for ${currentUser.displayName}`);
      processedCount++;
    }

    console.log('\n🎉 Profile enhancement completed successfully!');
    console.log(`📊 Enhanced ${processedCount} user profiles with detailed information`);

  } catch (error) {
    console.error('❌ Error importing detailed profiles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importDetailedProfiles()
  .then(() => {
    console.log('✨ All detailed profiles imported successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to import detailed profiles:', error);
    process.exit(1);
  });

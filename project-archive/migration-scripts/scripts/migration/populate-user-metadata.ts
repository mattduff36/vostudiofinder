#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { TursoDatabase } from '../../src/lib/migration/turso-db';

const prisma = new PrismaClient();
const tursoDb = new TursoDatabase();

interface MetadataMapping {
  [key: string]: {
    profileField?: keyof UserProfileData;
    transform?: (value: string) => any;
    category: 'professional' | 'social' | 'equipment' | 'preferences' | 'status' | 'other';
  };
}

interface UserProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  about?: string;
  shortAbout?: string;
  location?: string;
  rateTier1?: string;
  rateTier2?: string;
  rateTier3?: string;
  showRates?: boolean;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  vimeoUrl?: string;
  soundcloudUrl?: string;
  isCrbChecked?: boolean;
  isFeatured?: boolean;
  isSpotlight?: boolean;
  verificationLevel?: string;
  homeStudioDescription?: string;
  equipmentList?: string;
  servicesOffered?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showAddress?: boolean;
}

// Mapping of Turso metadata keys to our new schema
const metadataMapping: MetadataMapping = {
  // Professional Information
  'first_name': { profileField: 'firstName', category: 'professional' },
  'last_name': { profileField: 'lastName', category: 'professional' },
  'phone': { profileField: 'phone', category: 'professional' },
  'about': { profileField: 'about', category: 'professional' },
  'shortabout': { profileField: 'shortAbout', category: 'professional' },
  'location': { profileField: 'location', category: 'professional' },
  
  // Pricing Information
  'rates1': { profileField: 'rateTier1', category: 'professional' },
  'rates2': { profileField: 'rateTier2', category: 'professional' },
  'rates3': { profileField: 'rateTier3', category: 'professional' },
  'showrates': { 
    profileField: 'showRates', 
    transform: (v) => v === '1' || v === 'true',
    category: 'preferences' 
  },
  
  // Social Media
  'facebook': { profileField: 'facebookUrl', category: 'social' },
  'twitter': { profileField: 'twitterUrl', category: 'social' },
  'linkedin': { profileField: 'linkedinUrl', category: 'social' },
  'instagram': { profileField: 'instagramUrl', category: 'social' },
  'youtube': { profileField: 'youtubeUrl', category: 'social' },
  'vimeo': { profileField: 'vimeoUrl', category: 'social' },
  'soundcloud': { profileField: 'soundcloudUrl', category: 'social' },
  
  // Professional Status
  'crb': { 
    profileField: 'isCrbChecked', 
    transform: (v) => v === '1' || v === 'true',
    category: 'status' 
  },
  'featured': { 
    profileField: 'isFeatured', 
    transform: (v) => v === '1' || v === 'true',
    category: 'status' 
  },
  'spotlight': { 
    profileField: 'isSpotlight', 
    transform: (v) => v === '1' || v === 'true',
    category: 'status' 
  },
  'verified': { 
    profileField: 'verificationLevel', 
    transform: (v) => v === '1' || v === 'true' ? 'verified' : 'none',
    category: 'status' 
  },
  
  // Equipment & Studio
  'homestudio': { profileField: 'homeStudioDescription', category: 'equipment' },
  'homestudio2': { 
    profileField: 'equipmentList', 
    category: 'equipment' 
  },
  'connection1': { profileField: 'servicesOffered', category: 'equipment' },
  
  // Contact Preferences
  'showemail': { 
    profileField: 'showEmail', 
    transform: (v) => v === '1' || v === 'true',
    category: 'preferences' 
  },
  'showphone': { 
    profileField: 'showPhone', 
    transform: (v) => v === '1' || v === 'true',
    category: 'preferences' 
  },
  'showaddress': { 
    profileField: 'showAddress', 
    transform: (v) => v === '1' || v === 'true',
    category: 'preferences' 
  }
};

async function populateUserMetadata() {
  console.log('🚀 Starting User Metadata Population...\n');
  
  try {
    // Get all user metadata from Turso
    console.log('📊 Fetching user metadata from Turso...');
    const allUserMeta = await tursoDb.getAllUserMeta();
    
    console.log(`Found metadata for ${Object.keys(allUserMeta).length} users`);
    
    let profilesCreated = 0;
    let metadataRecordsCreated = 0;
    let errors = 0;
    
    for (const [tursoUserId, metadata] of Object.entries(allUserMeta)) {
      try {
        const prismaUserId = `turso_${tursoUserId}`;
        
        // Check if user exists in Prisma
        const user = await prisma.user.findUnique({
          where: { id: prismaUserId }
        });
        
        if (!user) {
          console.log(`⚠️  User ${prismaUserId} not found, skipping...`);
          continue;
        }
        
        // Prepare profile data
        const profileData: UserProfileData = {};
        const rawMetadata: Array<{ key: string; value: string }> = [];
        
        // Process each metadata field
        for (const [key, value] of Object.entries(metadata)) {
          if (!value || value.trim() === '') continue;
          
          const mapping = metadataMapping[key.toLowerCase()];
          
          if (mapping && mapping.profileField) {
            // Map to profile field
            const transformedValue = mapping.transform ? mapping.transform(value) : value;
            (profileData as any)[mapping.profileField] = transformedValue;
          }
          
          // Always store in raw metadata for flexibility
          rawMetadata.push({ key, value: value.toString() });
        }
        
        // Create or update user profile
        if (Object.keys(profileData).length > 0) {
          await prisma.userProfile.upsert({
            where: { userId: prismaUserId },
            create: {
              userId: prismaUserId,
              ...profileData
            },
            update: profileData
          });
          profilesCreated++;
        }
        
        // Create metadata records
        for (const { key, value } of rawMetadata) {
          await prisma.userMetadata.upsert({
            where: {
              userId_key: {
                userId: prismaUserId,
                key
              }
            },
            create: {
              userId: prismaUserId,
              key,
              value
            },
            update: {
              value
            }
          });
          metadataRecordsCreated++;
        }
        
        if (profilesCreated % 10 === 0) {
          console.log(`✅ Processed ${profilesCreated} profiles...`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${tursoUserId}:`, error);
        errors++;
      }
    }
    
    console.log('\n📊 User Metadata Population Summary:');
    console.log('=====================================');
    console.log(`✅ Profiles Created/Updated: ${profilesCreated}`);
    console.log(`✅ Metadata Records Created: ${metadataRecordsCreated}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Show some statistics
    const profileStats = await prisma.userProfile.groupBy({
      by: ['verificationLevel'],
      _count: true
    });
    
    console.log('\n🏆 Profile Statistics:');
    profileStats.forEach(stat => {
      console.log(`  ${stat.verificationLevel}: ${stat._count} users`);
    });
    
    const featuredCount = await prisma.userProfile.count({
      where: { isFeatured: true }
    });
    
    const spotlightCount = await prisma.userProfile.count({
      where: { isSpotlight: true }
    });
    
    console.log(`  Featured Users: ${featuredCount}`);
    console.log(`  Spotlight Users: ${spotlightCount}`);
    
    console.log('\n🎉 User metadata population completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await tursoDb.disconnect();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  populateUserMetadata().catch(console.error);
}

const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function uploadToCloudinary(filePath, folder) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'image',
    });
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error(`Failed to upload ${filePath}:`, error);
    throw error;
  }
}

// Map display names to potential filename variations
function generateFilenameVariations(displayName) {
  if (!displayName) return [];
  
  const variations = [];
  const cleaned = displayName.replace(/[^a-zA-Z0-9]/g, '');
  
  // Add exact match
  variations.push(cleaned);
  
  // Add lowercase
  variations.push(cleaned.toLowerCase());
  
  // Add with spaces removed but preserving case
  variations.push(displayName.replace(/\s/g, ''));
  
  // Add with hyphens instead of spaces
  variations.push(displayName.replace(/\s/g, '-'));
  
  // Add with underscores instead of spaces
  variations.push(displayName.replace(/\s/g, '_'));
  
  return [...new Set(variations)]; // Remove duplicates
}

// Find matching profile pictures for a user
function findProfilePictures(displayName, oldSiteUploadsPath) {
  const variations = generateFilenameVariations(displayName);
  const foundFiles = { avatar: null, studio: null };
  
  for (const variation of variations) {
    // Check for avatar files
    const avatarExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    for (const ext of avatarExtensions) {
      const avatarFile = `avatar-voiceover-studio-finder-${variation}${ext}`;
      const avatarPath = path.join(oldSiteUploadsPath, avatarFile);
      if (fs.existsSync(avatarPath) && !foundFiles.avatar) {
        foundFiles.avatar = { filename: avatarFile, path: avatarPath };
        break;
      }
    }
    
    // Check for studio files
    for (const ext of avatarExtensions) {
      const studioFile = `p1-voiceover-studio-finder-${variation}${ext}`;
      const studioPath = path.join(oldSiteUploadsPath, studioFile);
      if (fs.existsSync(studioPath) && !foundFiles.studio) {
        foundFiles.studio = { filename: studioFile, path: studioPath };
        break;
      }
    }
    
    // If we found both, we can stop
    if (foundFiles.avatar && foundFiles.studio) break;
  }
  
  return foundFiles;
}

async function importRemainingProfiles() {
  try {
    console.log('🚀 Starting focused profile picture import for existing users...');
    
    // Get all users from database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true
      }
    });
    
    console.log(`📊 Found ${users.length} users in database`);
    
    const oldSiteUploadsPath = path.join(__dirname, '../../../_BACKUPS/old-site/FULL WEBSITE/public_html/uploads');
    
    if (!fs.existsSync(oldSiteUploadsPath)) {
      throw new Error(`Old site uploads path not found: ${oldSiteUploadsPath}`);
    }
    
    let processed = 0;
    let avatarsImported = 0;
    let studiosImported = 0;
    let skipped = 0;
    
    for (const user of users) {
      try {
        console.log(`\n📝 Processing ${user.displayName} (${user.username})...`);
        
        // Skip if user already has an avatar
        if (user.avatarUrl) {
          console.log(`⏭️  User already has avatar, skipping...`);
          skipped++;
          continue;
        }
        
        // Find matching profile pictures
        const profilePics = findProfilePictures(user.displayName, oldSiteUploadsPath);
        
        if (!profilePics.avatar && !profilePics.studio) {
          console.log(`❌ No profile pictures found for ${user.displayName}`);
          skipped++;
          continue;
        }
        
        // Upload avatar if found
        if (profilePics.avatar) {
          console.log(`📸 Uploading avatar: ${profilePics.avatar.filename}`);
          const avatarResult = await uploadToCloudinary(profilePics.avatar.path, 'voiceover-studios/avatars');
          
          // Update user avatar
          await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: avatarResult.url }
          });
          
          avatarsImported++;
          console.log(`✅ Avatar imported for ${user.displayName}`);
        }
        
        // Upload studio image if found and user has a studio
        if (profilePics.studio) {
          const studio = await prisma.studio.findFirst({
            where: { ownerId: user.id }
          });
          
          if (studio) {
            console.log(`🏢 Uploading studio image: ${profilePics.studio.filename}`);
            const studioResult = await uploadToCloudinary(profilePics.studio.path, 'voiceover-studios/studios');
            
            // Check if studio already has images
            const existingImage = await prisma.studioImage.findFirst({
              where: { studioId: studio.id }
            });
            
            if (!existingImage) {
              await prisma.studioImage.create({
                data: {
                  studioId: studio.id,
                  imageUrl: studioResult.url,
                  altText: `${studio.name} - Studio Photo`,
                  sortOrder: 0,
                }
              });
              
              studiosImported++;
              console.log(`✅ Studio image imported for ${user.displayName}`);
            } else {
              console.log(`⏭️  Studio already has images, skipping...`);
            }
          } else {
            console.log(`ℹ️  User has no studio profile, skipping studio image`);
          }
        }
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Failed to process ${user.displayName}:`, error);
        skipped++;
      }
    }
    
    console.log('\n🎉 Import complete!');
    console.log(`📊 Processed: ${processed} users`);
    console.log(`📸 Avatars imported: ${avatarsImported}`);
    console.log(`🏢 Studio images imported: ${studiosImported}`);
    console.log(`⏭️  Skipped: ${skipped} users`);
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importRemainingProfiles();

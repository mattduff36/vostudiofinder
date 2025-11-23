import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_PATH = 'D:\\Websites\\vosf-old-site\\archive\\FULL WEBSITE\\public_html\\uploads';

interface ImageFile {
  filename: string;
  fullPath: string;
  pictureNumber: number;
  username: string;
}

interface ProfileImageData {
  username: string;
  currentImageCount: number;
  oldImages: ImageFile[];
  studioId: string;
  existingImages: Array<{ id: string; image_url: string }>;
}

/**
 * Parse filename to extract picture number and username
 * Pattern: p[number]-voiceover-studio-finder-[username].[ext]
 */
function parseFilename(filename: string): ImageFile | null {
  const match = filename.match(/^p(\d+)-voiceover-studio-finder-(.+)\.(jpg|jpeg|png|gif)$/i);
  
  if (!match) return null;
  
  const [, pictureNum, username, ext] = match;
  
  return {
    filename,
    fullPath: path.join(UPLOADS_PATH, filename),
    pictureNumber: parseInt(pictureNum, 10),
    username: username,
  };
}

/**
 * Get all eligible image files from uploads folder
 */
function getOldImages(): Map<string, ImageFile[]> {
  console.log('📂 Scanning uploads folder...\n');
  
  const files = fs.readdirSync(UPLOADS_PATH);
  const imagesByUsername = new Map<string, ImageFile[]>();
  
  let totalFound = 0;
  let totalIgnored = 0;
  
  for (const filename of files) {
    // Skip files that don't match p[number] pattern
    if (!filename.match(/^p\d+-.+\.(jpg|jpeg|png|gif)$/i)) {
      totalIgnored++;
      continue;
    }
    
    const parsed = parseFilename(filename);
    if (parsed) {
      const images = imagesByUsername.get(parsed.username) || [];
      images.push(parsed);
      imagesByUsername.set(parsed.username, images);
      totalFound++;
    } else {
      totalIgnored++;
    }
  }
  
  console.log(`✅ Found ${totalFound} eligible images`);
  console.log(`⏭️  Ignored ${totalIgnored} files (not matching p[number] pattern)\n`);
  
  // Sort images by picture number for each username
  for (const [username, images] of imagesByUsername.entries()) {
    images.sort((a, b) => a.pictureNumber - b.pictureNumber);
  }
  
  return imagesByUsername;
}

/**
 * Get profiles that need image replacement (≤2 images)
 */
async function getProfilesNeedingImages(): Promise<ProfileImageData[]> {
  console.log('🔍 Finding profiles with ≤2 images...\n');
  
  // Get all studios with their image counts and usernames
  const studios = await prisma.studios.findMany({
    where: {
      status: 'ACTIVE',
    },
    include: {
      users: {
        select: {
          username: true,
        },
      },
      studio_images: {
        select: {
          id: true,
          image_url: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: 'asc',
        },
      },
    },
  });
  
  const profilesNeedingImages: ProfileImageData[] = [];
  
  for (const studio of studios) {
    const imageCount = studio.studio_images.length;
    
    if (imageCount <= 2 && studio.users.username) {
      profilesNeedingImages.push({
        username: studio.users.username,
        currentImageCount: imageCount,
        oldImages: [],
        studioId: studio.id,
        existingImages: studio.studio_images,
      });
    }
  }
  
  console.log(`✅ Found ${profilesNeedingImages.length} profiles with ≤2 images\n`);
  
  return profilesNeedingImages;
}

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(filePath: string, username: string, pictureNumber: number): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'voiceover-studios',
      public_id: `${username}-p${pictureNumber}-${Date.now()}`,
      resource_type: 'image',
      overwrite: false,
    });
    
    return result.secure_url;
  } catch (error: any) {
    console.error(`❌ Failed to upload ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 */
async function deleteFromCloudinary(imageUrl: string): Promise<void> {
  try {
    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const filenameWithoutExt = filename.split('.')[0];
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${filenameWithoutExt}`;
    
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    console.warn(`⚠️  Could not delete from Cloudinary: ${imageUrl}`, error.message);
    // Continue anyway - we'll delete from database
  }
}

/**
 * Process a single profile
 */
async function processProfile(profile: ProfileImageData): Promise<void> {
  console.log(`\n📸 Processing: ${profile.username}`);
  console.log(`   Current images: ${profile.currentImageCount}`);
  console.log(`   Old images found: ${profile.oldImages.length}`);
  
  if (profile.oldImages.length <= 1) {
    console.log(`   ⏭️  Skipping (≤1 old images found)`);
    return;
  }
  
  try {
    // Step 1: Delete existing images from Cloudinary
    console.log(`   🗑️  Deleting ${profile.existingImages.length} existing images...`);
    for (const img of profile.existingImages) {
      await deleteFromCloudinary(img.image_url);
    }
    
    // Step 2: Delete existing images from database
    await prisma.studio_images.deleteMany({
      where: {
        studio_id: profile.studioId,
      },
    });
    
    // Step 3: Upload new images to Cloudinary
    console.log(`   ☁️  Uploading ${profile.oldImages.length} new images to Cloudinary...`);
    const uploadedImages: Array<{ url: string; sortOrder: number }> = [];
    
    for (const oldImage of profile.oldImages) {
      try {
        const url = await uploadToCloudinary(
          oldImage.fullPath,
          profile.username,
          oldImage.pictureNumber
        );
        uploadedImages.push({
          url,
          sortOrder: oldImage.pictureNumber, // Use picture number as sort order
        });
        console.log(`      ✅ p${oldImage.pictureNumber}: ${oldImage.filename}`);
      } catch (error) {
        console.error(`      ❌ Failed: ${oldImage.filename}`);
      }
    }
    
    // Step 4: Insert new images into database
    console.log(`   💾 Saving ${uploadedImages.length} images to database...`);
    for (const img of uploadedImages) {
      await prisma.studio_images.create({
        data: {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          studio_id: profile.studioId,
          image_url: img.url,
          sort_order: img.sortOrder,
          alt_text: `Studio image ${img.sortOrder}`,
        },
      });
    }
    
    console.log(`   ✅ Successfully processed ${profile.username}`);
    
  } catch (error: any) {
    console.error(`   ❌ Error processing ${profile.username}:`, error.message);
  }
}

/**
 * Main migration function
 */
async function migrateImages() {
  console.log('🚀 Starting Old Image Migration\n');
  console.log('=' .repeat(60));
  console.log('\n');
  
  try {
    // Step 1: Get all old images grouped by username
    const oldImagesByUsername = getOldImages();
    
    // Step 2: Get profiles needing images
    const profilesNeedingImages = await getProfilesNeedingImages();
    
    // Step 3: Match profiles with old images
    const profilesToProcess: ProfileImageData[] = [];
    
    for (const profile of profilesNeedingImages) {
      const oldImages = oldImagesByUsername.get(profile.username);
      if (oldImages && oldImages.length > 1) {
        profile.oldImages = oldImages;
        profilesToProcess.push(profile);
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Profiles with ≤2 images: ${profilesNeedingImages.length}`);
    console.log(`   Profiles with matching old images: ${profilesToProcess.length}`);
    console.log(`   Profiles to process: ${profilesToProcess.length}`);
    console.log('\n' + '='.repeat(60));
    
    if (profilesToProcess.length === 0) {
      console.log('\n✅ No profiles need processing. Migration complete!');
      return;
    }
    
    // Step 4: Process each profile
    console.log('\n🔄 Starting migration...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const profile of profilesToProcess) {
      try {
        await processProfile(profile);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 Migration Complete!');
    console.log(`   ✅ Successfully processed: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n' + '='.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateImages();


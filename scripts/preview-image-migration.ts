import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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
  studioName: string;
}

/**
 * Parse filename to extract picture number and username
 */
function parseFilename(filename: string): ImageFile | null {
  const match = filename.match(/^p(\d+)-voiceover-studio-finder-(.+)\.(jpg|jpeg|png|gif)$/i);
  
  if (!match) return null;
  
  const [, pictureNum, username] = match;
  
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
  
  console.log(`✅ Found ${totalFound} eligible p[number] images`);
  console.log(`⏭️  Ignored ${totalIgnored} files\n`);
  
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
  
  const studios = await prisma.studios.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      users: {
        select: {
          username: true,
        },
      },
      studio_images: {
        select: {
          id: true,
          image_url: true,
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
        studioName: studio.name,
      });
    }
  }
  
  console.log(`✅ Found ${profilesNeedingImages.length} profiles with ≤2 images\n`);
  
  return profilesNeedingImages;
}

/**
 * Preview migration
 */
async function previewMigration() {
  console.log('🔍 DRY RUN - Preview Image Migration\n');
  console.log('=' .repeat(80));
  console.log('\n');
  
  try {
    // Get all old images grouped by username
    const oldImagesByUsername = getOldImages();
    
    // Get profiles needing images
    const profilesNeedingImages = await getProfilesNeedingImages();
    
    // Match profiles with old images
    const profilesToProcess: ProfileImageData[] = [];
    const profilesSkipped: ProfileImageData[] = [];
    
    for (const profile of profilesNeedingImages) {
      const oldImages = oldImagesByUsername.get(profile.username);
      if (oldImages) {
        profile.oldImages = oldImages;
        if (oldImages.length > 1) {
          profilesToProcess.push(profile);
        } else {
          profilesSkipped.push(profile);
        }
      } else {
        profilesSkipped.push(profile);
      }
    }
    
    console.log('=' .repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`   Total profiles with ≤2 images: ${profilesNeedingImages.length}`);
    console.log(`   Profiles that WILL be processed: ${profilesToProcess.length}`);
    console.log(`   Profiles that will be SKIPPED: ${profilesSkipped.length}`);
    console.log('\n' + '='.repeat(80));
    
    // Show detailed list of profiles to process
    if (profilesToProcess.length > 0) {
      console.log('\n✅ PROFILES TO PROCESS:\n');
      
      for (const profile of profilesToProcess) {
        console.log(`   📸 ${profile.username} (${profile.studioName})`);
        console.log(`      Current: ${profile.currentImageCount} images → Will have: ${profile.oldImages.length} images`);
        console.log(`      New images (sorted by p[number]):`);
        
        for (const img of profile.oldImages) {
          const exists = fs.existsSync(img.fullPath);
          const status = exists ? '✅' : '❌ FILE NOT FOUND';
          console.log(`         p${img.pictureNumber}: ${img.filename} ${status}`);
        }
        console.log('');
      }
    }
    
    // Show skipped profiles
    if (profilesSkipped.length > 0) {
      console.log('\n⏭️  PROFILES SKIPPED (≤1 old images found):\n');
      
      for (const profile of profilesSkipped) {
        const oldImagesCount = profile.oldImages.length;
        console.log(`   ${profile.username} (${profile.studioName})`);
        console.log(`      Current: ${profile.currentImageCount} images, Old folder: ${oldImagesCount} images`);
      }
      console.log('');
    }
    
    console.log('=' .repeat(80));
    console.log('\n⚠️  THIS WAS A DRY RUN - No changes were made');
    console.log('\n💡 To run the actual migration, use: npx tsx scripts/migrate-old-images.ts');
    console.log('\n' + '='.repeat(80));
    
  } catch (error: any) {
    console.error('\n❌ Preview failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run preview
previewMigration();


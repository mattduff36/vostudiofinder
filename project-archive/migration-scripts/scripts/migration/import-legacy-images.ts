import { PrismaClient, StudioType, ServiceType } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function uploadToCloudinary(filePath: string, folder: string): Promise<{ url: string; public_id: string }> {
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

async function createStudioProfiles() {
  console.log('🚀 Starting legacy image import and studio profile creation...');

  // Define our sample users with their images
  const sampleUsers = [
    {
      username: 'voiceoverguy_1848',
      displayName: 'VoiceoverGuy',
      studioName: 'VoiceoverGuy Professional Studio',
      description: 'Professional voiceover studio with state-of-the-art equipment and acoustics.',
      location: 'London, UK',
      address: 'London, United Kingdom',
      services: ['Commercial Voiceover', 'Narration', 'Character Voices', 'Corporate'],
      avatarFile: 'avatar-voiceover-studio-finder-VoiceoverGuy.jpg',
      studioFile: 'p1-voiceover-studio-finder-VoiceoverGuy.jpg',
    },
    {
      username: 's2blue_1851',
      displayName: 'S2Blue',
      studioName: 'S2Blue Recording Studio',
      description: 'Modern recording facility specializing in voiceover production and audio post-production.',
      location: 'Manchester, UK',
      address: 'Manchester, United Kingdom',
      services: ['Voiceover Recording', 'Audio Editing', 'Sound Design', 'Mixing'],
      avatarFile: 'avatar-voiceover-studio-finder-S2Blue.png',
      studioFile: 'p1-voiceover-studio-finder-S2Blue.jpg',
    },
    {
      username: 'audiotake_1854',
      displayName: 'AudioTake',
      studioName: 'AudioTake Studios',
      description: 'Full-service audio production studio offering professional voiceover recording and post-production.',
      location: 'Birmingham, UK',
      address: 'Birmingham, United Kingdom',
      services: ['Voice Recording', 'Audio Production', 'Podcast Recording', 'Commercial Work'],
      avatarFile: 'avatar-voiceover-studio-finder-AudioTake.png',
      studioFile: 'p1-voiceover-studio-finder-AudioTake.jpg',
    },
    {
      username: 'a1vox_1863',
      displayName: 'A1Vox',
      studioName: 'A1Vox Professional Voiceovers',
      description: 'Premium voiceover studio with professional acoustics and high-end recording equipment.',
      location: 'Bristol, UK',
      address: 'Bristol, United Kingdom',
      services: ['Corporate Voiceover', 'E-learning', 'Commercials', 'IVR'],
      avatarFile: 'avatar-voiceover-studio-finder-A1Vox.png',
      studioFile: 'p1-voiceover-studio-finder-A1Vox.png',
    },
    {
      username: 'mikecooper_1869',
      displayName: 'Mike Cooper',
      studioName: 'Mike Cooper Voice Studio',
      description: 'Experienced voice artist with professional home studio setup for high-quality recordings.',
      location: 'Leeds, UK',
      address: 'Leeds, United Kingdom',
      services: ['Narration', 'Documentary', 'Corporate Training', 'Audiobooks'],
      avatarFile: 'avatar-voiceover-studio-finder-MikeCooper.jpg',
      studioFile: 'p1-voiceover-studio-finder-MikeCooper.jpg',
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const userData of sampleUsers) {
    try {
      console.log(`\n📝 Processing ${userData.displayName}...`);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (!user) {
        console.log(`❌ User ${userData.username} not found, skipping...`);
        skippedCount++;
        continue;
      }

      // Check if studio already exists
      const existingStudio = await prisma.studio.findFirst({
        where: { ownerId: user.id },
      });

      if (existingStudio) {
        console.log(`⏭️  Studio already exists for ${userData.displayName}, skipping...`);
        skippedCount++;
        continue;
      }

      // Upload avatar image
      let avatarUrl = null;
      const avatarPath = path.join('public/legacy-images', userData.avatarFile);
      if (fs.existsSync(avatarPath)) {
        console.log(`📸 Uploading avatar: ${userData.avatarFile}`);
        const avatarResult = await uploadToCloudinary(avatarPath, 'voiceover-studios/avatars');
        avatarUrl = avatarResult.url;

        // Update user avatar
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: avatarUrl },
        });
      }

      // Upload studio image
      let studioImageUrl = null;
      const studioPath = path.join('public/legacy-images', userData.studioFile);
      if (fs.existsSync(studioPath)) {
        console.log(`🏢 Uploading studio image: ${userData.studioFile}`);
        const studioResult = await uploadToCloudinary(studioPath, 'voiceover-studios/studios');
        studioImageUrl = studioResult.url;
      }

      // Create studio
      const studio = await prisma.studio.create({
        data: {
          name: userData.studioName,
          description: userData.description,
          studioType: StudioType.HOME,
          address: userData.address,
          latitude: 51.5074, // Default to London coordinates
          longitude: -0.1278,
          ownerId: user.id,
          isVerified: true,
          isPremium: true,
          status: 'ACTIVE',
        },
      });

      // Add studio images
      if (studioImageUrl) {
        await prisma.studioImage.create({
          data: {
            studioId: studio.id,
            imageUrl: studioImageUrl,
            altText: `${userData.studioName} - Studio Photo`,
            sortOrder: 0,
          },
        });
      }

      // Add services - using available service types
      const serviceTypes = [ServiceType.ISDN, ServiceType.SOURCE_CONNECT, ServiceType.ZOOM];
      for (let i = 0; i < Math.min(userData.services.length, serviceTypes.length); i++) {
        const serviceType = serviceTypes[i];
        if (serviceType) {
          await prisma.studioService.create({
            data: {
              studioId: studio.id,
              service: serviceType,
            },
          });
        }
      }

      console.log(`✅ Created studio profile for ${userData.displayName}`);
      createdCount++;

    } catch (error) {
      console.error(`❌ Failed to process ${userData.displayName}:`, error);
    }
  }

  console.log('\n🎉 Import complete!');
  console.log(`✅ Created: ${createdCount} studio profiles`);
  console.log(`⏭️  Skipped: ${skippedCount} profiles`);
}

async function main() {
  try {
    await createStudioProfiles();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

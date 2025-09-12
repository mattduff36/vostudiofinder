import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function importCompleteVoiceoverGuyProfile() {
  console.log('Importing complete VoiceoverGuy profile...');

  try {
    // First, get or create the user and studio
    let user = await prisma.user.findUnique({
      where: { username: 'VoiceoverGuy' }
    });

    if (!user) {
      console.log('Creating VoiceoverGuy user...');
      user = await prisma.user.create({
        data: {
          username: 'VoiceoverGuy',
          email: 'guy@voiceoverguy.co.uk',
          displayName: 'VoiceoverGuy',
          role: 'STUDIO_OWNER',
          emailVerified: true,
          avatarUrl: '/legacy-images/avatar-voiceover-studio-finder-VoiceoverGuy.jpg',
        }
      });
    }

    // Get or create the studio
    let studio = await prisma.studio.findFirst({
      where: { ownerId: user.id }
    });

    if (!studio) {
      console.log('Creating VoiceoverGuy studio...');
      studio = await prisma.studio.create({
        data: {
          ownerId: user.id,
          name: 'VoiceoverGuy Studio',
          description: `Professional voiceover recording studio specializing in high-quality voice recordings for commercials, documentaries, audiobooks, and corporate content. 

Features include:
• Professional-grade recording equipment
• Acoustically treated recording space
• Source Connect NOW for remote sessions
• Same-day turnaround available
• Over 10 years of experience
• Specializes in British English voiceovers
• Commercial, documentary, and corporate work
• Professional editing and mastering included

Located in a purpose-built home studio with professional acoustics and state-of-the-art recording equipment. Perfect for clients looking for high-quality voiceover work with fast turnaround times.

Available for both in-person and remote recording sessions via Source Connect NOW, Session Link Pro, Zoom, and Microsoft Teams.`,
          studioType: 'HOME',
          address: 'United Kingdom',
          websiteUrl: 'https://voiceoverguy.co.uk',
          phone: '07973350178',
          isPremium: true,
          isVerified: true,
          status: 'ACTIVE',
        }
      });
    } else {
      console.log('Updating existing VoiceoverGuy studio...');
      studio = await prisma.studio.update({
        where: { id: studio.id },
        data: {
          description: `Professional voiceover recording studio specializing in high-quality voice recordings for commercials, documentaries, audiobooks, and corporate content. 

Features include:
• Professional-grade recording equipment
• Acoustically treated recording space
• Source Connect NOW for remote sessions
• Same-day turnaround available
• Over 10 years of experience
• Specializes in British English voiceovers
• Commercial, documentary, and corporate work
• Professional editing and mastering included

Located in a purpose-built home studio with professional acoustics and state-of-the-art recording equipment. Perfect for clients looking for high-quality voiceover work with fast turnaround times.

Available for both in-person and remote recording sessions via Source Connect NOW, Session Link Pro, Zoom, and Microsoft Teams.`,
          websiteUrl: 'https://voiceoverguy.co.uk',
          phone: '07973350178',
          isPremium: true,
          isVerified: true,
        }
      });
    }

    // Clear existing images
    await prisma.studioImage.deleteMany({
      where: { studioId: studio.id }
    });

    // Import all VoiceoverGuy images found in the backup (reordered for better main image)
    const voiceoverGuyImages = [
      { filename: 'p1-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 1, altText: 'Professional Recording Setup - Main Studio View' },
      { filename: 'avatar-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 2, altText: 'VoiceoverGuy Studio Avatar' },
      { filename: 'p2-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 3, altText: 'Studio Equipment' },
      { filename: 'p3-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 4, altText: 'Acoustic Treatment' },
      { filename: 'p4-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 5, altText: 'Recording Booth Interior' },
      { filename: 'p5-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 6, altText: 'Professional Microphone Setup' },
      { filename: 'p6-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 7, altText: 'Studio Control Room' },
      { filename: 'p10-voiceover-studio-finder-VoiceoverGuy.jpg', sortOrder: 8, altText: 'Complete Studio Overview' },
      { filename: 'VoiceoverGuy.jpg', sortOrder: 9, altText: 'VoiceoverGuy Profile' },
      { filename: 'showreels-VoiceoverGuy.jpg', sortOrder: 10, altText: 'VoiceoverGuy Showreel' },
    ];

    console.log('Importing images...');
    for (const image of voiceoverGuyImages) {
      const imagePath = `/legacy-images/${image.filename}`;
      
      // Check if image file exists
      const fullPath = path.join(process.cwd(), 'public', 'legacy-images', image.filename);
      if (fs.existsSync(fullPath)) {
        await prisma.studioImage.create({
          data: {
            studioId: studio.id,
            imageUrl: imagePath,
            altText: image.altText,
            sortOrder: image.sortOrder,
          }
        });
        console.log(`✓ Imported ${image.filename}`);
      } else {
        console.log(`⚠ Image not found: ${image.filename}`);
      }
    }

    // Clear existing services
    await prisma.studioService.deleteMany({
      where: { studioId: studio.id }
    });

    // Add services
    const services = ['SOURCE_CONNECT_NOW', 'SESSION_LINK_PRO', 'ZOOM', 'TEAMS'];
    for (const service of services) {
      await prisma.studioService.create({
        data: {
          studioId: studio.id,
          service: service as any,
        }
      });
    }

    console.log('✅ Complete VoiceoverGuy profile imported successfully!');
    console.log(`User ID: ${user.id}`);
    console.log(`Studio ID: ${studio.id}`);
    console.log(`Images imported: ${voiceoverGuyImages.length}`);
    console.log(`Services: ${services.join(', ')}`);

  } catch (error) {
    console.error('Error importing VoiceoverGuy profile:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCompleteVoiceoverGuyProfile();

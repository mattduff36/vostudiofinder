import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

const OLD_UPLOADS_DIR = 'D:\\Websites\\vosf-old-site\\archive\\FULL WEBSITE\\public_html\\uploads';

// Load environment variables manually for ts-node
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface AvatarToMigrate {
  username: string;
  userId: string;
  currentAvatar: string | null;
  newAvatarFile: string;
  action: 'ADD' | 'REPLACE';
}

async function uploadToCloudinary(filePath: string, userId: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `voiceover-studios/avatars`,
      public_id: userId,
      overwrite: true,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading to Cloudinary:`, error);
    throw error;
  }
}

async function migrateAvatars() {
  try {
    console.log('🚀 Starting avatar migration...\n');

    // Get all files from the old uploads directory
    const files = fs.readdirSync(OLD_UPLOADS_DIR);
    
    // Filter for avatar images
    const avatarFiles = files.filter(file => 
      file.toLowerCase().startsWith('avatar') && 
      /\.(jpg|jpeg|png|gif)$/i.test(file)
    );

    console.log(`Found ${avatarFiles.length} avatar images\n`);

    // Get all users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        avatar_url: true,
      },
    });

    const toMigrate: AvatarToMigrate[] = [];

    // Match avatar files to users
    for (const file of avatarFiles) {
      const match = file.match(/^avatar-voiceover-studio-finder-([^.]+)\.(jpg|jpeg|png|gif)$/i);
      
      if (match) {
        const username = match[1];
        const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
        
        if (user) {
          toMigrate.push({
            username: user.username || username,
            userId: user.id,
            currentAvatar: user.avatar_url,
            newAvatarFile: file,
            action: user.avatar_url ? 'REPLACE' : 'ADD',
          });
        }
      }
    }

    console.log(`📊 Migrating ${toMigrate.length} avatars...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ username: string; error: string }> = [];

    // Process each avatar
    for (let i = 0; i < toMigrate.length; i++) {
      const avatar = toMigrate[i];
      const progress = `[${i + 1}/${toMigrate.length}]`;
      
      try {
        console.log(`${progress} Processing ${avatar.username}...`);
        
        // Upload to Cloudinary
        const filePath = path.join(OLD_UPLOADS_DIR, avatar.newAvatarFile);
        const cloudinaryUrl = await uploadToCloudinary(filePath, avatar.userId);
        
        // Update user record
        await prisma.users.update({
          where: { id: avatar.userId },
          data: { avatar_url: cloudinaryUrl },
        });
        
        successCount++;
        console.log(`  ✅ ${avatar.action === 'ADD' ? 'Added' : 'Replaced'} avatar for ${avatar.username}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ username: avatar.username, error: errorMsg });
        console.error(`  ❌ Error processing ${avatar.username}:`, errorMsg);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 MIGRATION COMPLETE\n');
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ username, error }) => {
        console.log(`  • ${username}: ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAvatars();


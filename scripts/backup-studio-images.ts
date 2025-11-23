import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupStudioImages() {
  console.log('💾 Creating backup of studio_images table...\n');
  
  try {
    // Get all studio images
    const allImages = await prisma.studio_images.findMany({
      include: {
        studios: {
          select: {
            name: true,
            users: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: [
        { studio_id: 'asc' },
        { sort_order: 'asc' },
      ],
    });
    
    console.log(`✅ Found ${allImages.length} total images across all studios\n`);
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].replace(/[:.]/g, '-').substring(0, 8);
    const backupFile = path.join(backupDir, `studio_images_backup_${timestamp}_${timeStr}.json`);
    
    // Save backup
    fs.writeFileSync(backupFile, JSON.stringify(allImages, null, 2), 'utf-8');
    
    console.log(`✅ Backup saved to: ${backupFile}`);
    console.log(`📦 Backup size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
    console.log(`📸 Total images backed up: ${allImages.length}\n`);
    
    // Also create a summary file
    const summaryFile = path.join(backupDir, `studio_images_summary_${timestamp}_${timeStr}.txt`);
    
    let summary = `STUDIO IMAGES BACKUP SUMMARY\n`;
    summary += `============================\n\n`;
    summary += `Backup Date: ${new Date().toISOString()}\n`;
    summary += `Total Images: ${allImages.length}\n\n`;
    summary += `Images by Studio:\n`;
    summary += `------------------\n\n`;
    
    // Group by studio
    const imagesByStudio = new Map<string, typeof allImages>();
    for (const img of allImages) {
      const studioId = img.studio_id;
      const images = imagesByStudio.get(studioId) || [];
      images.push(img);
      imagesByStudio.set(studioId, images);
    }
    
    for (const [studioId, images] of imagesByStudio.entries()) {
      const username = images[0]?.studios?.users?.username || 'Unknown';
      const studioName = images[0]?.studios?.name || 'Unknown';
      summary += `${username} (${studioName}): ${images.length} images\n`;
      for (const img of images) {
        summary += `  - ${img.image_url} (sort: ${img.sort_order})\n`;
      }
      summary += `\n`;
    }
    
    fs.writeFileSync(summaryFile, summary, 'utf-8');
    console.log(`✅ Summary saved to: ${summaryFile}\n`);
    
    console.log('=' .repeat(60));
    console.log('✅ BACKUP COMPLETE');
    console.log('=' .repeat(60));
    
    return backupFile;
    
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupStudioImages();


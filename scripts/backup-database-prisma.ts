import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('💾 Creating database backup using Prisma...\n');
  
  try {
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    
    console.log('📊 Exporting all tables...\n');
    
    // Export all relevant tables
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {} as any,
    };
    
    // Studios and related data
    console.log('   📸 Exporting studios...');
    backup.tables.studios = await prisma.studios.findMany({
      include: {
        studio_images: true,
        studio_services: true,
        studio_studio_types: true,
      },
    });
    console.log(`      ✅ ${backup.tables.studios.length} studios`);
    
    // Users
    console.log('   👤 Exporting users...');
    backup.tables.users = await prisma.users.findMany();
    console.log(`      ✅ ${backup.tables.users.length} users`);
    
    // User profiles
    console.log('   📝 Exporting user_profiles...');
    backup.tables.user_profiles = await prisma.user_profiles.findMany();
    console.log(`      ✅ ${backup.tables.user_profiles.length} profiles`);
    
    // Reviews
    console.log('   ⭐ Exporting reviews...');
    backup.tables.reviews = await prisma.reviews.findMany({
      include: {
        review_responses: true,
      },
    });
    console.log(`      ✅ ${backup.tables.reviews.length} reviews`);
    
    // Studio images (standalone for easy restore)
    console.log('   🖼️  Exporting studio_images...');
    backup.tables.studio_images = await prisma.studio_images.findMany();
    console.log(`      ✅ ${backup.tables.studio_images.length} images`);
    
    // Accounts
    console.log('   🔑 Exporting accounts...');
    backup.tables.accounts = await prisma.accounts.findMany();
    console.log(`      ✅ ${backup.tables.accounts.length} accounts`);
    
    // Sessions
    console.log('   🎫 Exporting sessions...');
    backup.tables.sessions = await prisma.sessions.findMany();
    console.log(`      ✅ ${backup.tables.sessions.length} sessions`);
    
    // Messages
    console.log('   💌 Exporting messages...');
    backup.tables.messages = await prisma.messages.findMany();
    console.log(`      ✅ ${backup.tables.messages.length} messages`);
    
    // Notifications
    console.log('   🔔 Exporting notifications...');
    backup.tables.notifications = await prisma.notifications.findMany();
    console.log(`      ✅ ${backup.tables.notifications.length} notifications`);
    
    // FAQ
    console.log('   ❓ Exporting faq...');
    backup.tables.faq = await prisma.faq.findMany();
    console.log(`      ✅ ${backup.tables.faq.length} faq items`);
    
    console.log('\n');
    
    // Save main backup file
    const backupFile = path.join(backupDir, `database_backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    
    const backupSize = fs.statSync(backupFile).size;
    const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);
    
    // Create a separate backup file just for studio_images (for quick restore)
    const imagesBackupFile = path.join(backupDir, `studio_images_backup_${timestamp}.json`);
    fs.writeFileSync(imagesBackupFile, JSON.stringify(backup.tables.studio_images, null, 2), 'utf-8');
    
    const imagesSizeMB = (fs.statSync(imagesBackupFile).size / (1024 * 1024)).toFixed(2);
    
    console.log('=' .repeat(60));
    console.log('✅ DATABASE BACKUP COMPLETE');
    console.log('=' .repeat(60));
    console.log(`📁 Full backup: ${backupFile}`);
    console.log(`📦 Size: ${backupSizeMB} MB`);
    console.log('');
    console.log(`📸 Studio images backup: ${imagesBackupFile}`);
    console.log(`📦 Size: ${imagesSizeMB} MB`);
    console.log('');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));
    console.log('\n💡 Backup includes all critical tables and relationships');
    console.log('💡 Studio images can be restored independently if needed\n');
    
    return { backupFile, imagesBackupFile };
    
  } catch (error: any) {
    console.error('\n❌ Backup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();


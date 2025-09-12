#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function backupNeonDatabase() {
  console.log('💾 Creating backup of Neon database...\n');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData: any = {
      timestamp,
      metadata: {
        createdAt: new Date().toISOString(),
        description: 'Neon PostgreSQL database backup before enhanced Turso migration'
      },
      data: {}
    };
    
    // Backup all tables
    console.log('📋 Backing up data...');
    
    const [
      users,
      accounts,
      sessions,
      studios,
      studioServices,
      studioImages,
      reviews,
      reviewResponses,
      messages,
      userConnections,
      subscriptions,
      savedSearches,
      pendingSubscriptions,
      notifications,
      contentReports,
      refunds
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.account.findMany(),
      prisma.session.findMany(),
      prisma.studio.findMany(),
      prisma.studioService.findMany(),
      prisma.studioImage.findMany(),
      prisma.review.findMany(),
      prisma.reviewResponse.findMany(),
      prisma.message.findMany(),
      prisma.userConnection.findMany(),
      prisma.subscription.findMany(),
      prisma.savedSearch.findMany(),
      prisma.pendingSubscription.findMany(),
      prisma.notification.findMany(),
      prisma.contentReport.findMany(),
      prisma.refund.findMany()
    ]);
    
    backupData.data = {
      users,
      accounts,
      sessions,
      studios,
      studioServices,
      studioImages,
      reviews,
      reviewResponses,
      messages,
      userConnections,
      subscriptions,
      savedSearches,
      pendingSubscriptions,
      notifications,
      contentReports,
      refunds
    };
    
    // Calculate totals
    const totalRecords = Object.values(backupData.data).reduce((sum: number, table: any) => {
      return sum + (Array.isArray(table) ? table.length : 0);
    }, 0);
    
    backupData.metadata.totalRecords = totalRecords;
    
    // Save backup file
    const backupFileName = `neon-backup-${timestamp}.json`;
    const backupPath = join(process.cwd(), 'backups', backupFileName);
    
    // Create backups directory if it doesn't exist
    const { mkdirSync } = await import('fs');
    try {
      mkdirSync(join(process.cwd(), 'backups'), { recursive: true });
    } catch (error) {
      // Directory already exists
    }
    
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📊 Total records backed up: ${totalRecords}`);
    
    // Print summary
    console.log('\n📋 Backup Summary:');
    Object.entries(backupData.data).forEach(([table, records]: [string, any]) => {
      if (Array.isArray(records) && records.length > 0) {
        console.log(`  ${table}: ${records.length} records`);
      }
    });
    
    return {
      backupPath,
      totalRecords,
      timestamp
    };
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Neon Database Backup Utility\n');
  console.log('This will create a complete backup of your current Neon database.\n');
  
  try {
    const result = await backupNeonDatabase();
    
    console.log('\n🎯 Next Steps:');
    console.log('==============');
    console.log('1. Your data is safely backed up');
    console.log('2. You can now run: npm run migrate:enhanced');
    console.log('3. If anything goes wrong, you can restore from the backup');
    console.log(`4. Backup file: ${result.backupPath}`);
    
  } catch (error) {
    console.error('❌ Backup process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

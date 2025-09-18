#!/usr/bin/env node

import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';

/**
 * Database Cleanup Utility
 * Removes all existing data from Prisma database while preserving schema
 */

export class DatabaseCleanup {
  
  /**
   * Clean all data from the database (preserving schema)
   */
  async cleanAllData(): Promise<void> {
    migrationLogger.startPhase('Database Cleanup', 'Removing all existing data while preserving schema');

    try {
      // Get initial counts
      const initialStats = await this.getDatabaseCounts();
      migrationLogger.stats('Initial Database Counts', initialStats, 'CLEANUP');

      // Delete in reverse dependency order to avoid foreign key constraints
      migrationLogger.info('Deleting data in dependency order...', 'CLEANUP');

      // 1. Delete dependent records first
      await this.deleteTable('review_responses', 'ReviewResponse');
      await this.deleteTable('reviews', 'Review');
      await this.deleteTable('studio_services', 'StudioService');
      await this.deleteTable('studio_images', 'StudioImage');
      await this.deleteTable('notifications', 'Notification');
      await this.deleteTable('messages', 'Message');
      await this.deleteTable('user_connections', 'UserConnection');
      await this.deleteTable('saved_searches', 'SavedSearch');
      await this.deleteTable('content_reports', 'ContentReport');
      await this.deleteTable('refunds', 'Refund');
      await this.deleteTable('pending_subscriptions', 'PendingSubscription');
      await this.deleteTable('subscriptions', 'Subscription');
      await this.deleteTable('user_metadata', 'UserMetadata');

      // 2. Delete main entity records
      await this.deleteTable('studios', 'Studio');
      await this.deleteTable('user_profiles', 'UserProfile');
      
      // 3. Delete authentication records
      await this.deleteTable('sessions', 'Session');
      await this.deleteTable('accounts', 'Account');
      
      // 4. Finally delete users (root entity)
      await this.deleteTable('users', 'User');

      // Verify cleanup
      const finalStats = await this.getDatabaseCounts();
      migrationLogger.stats('Final Database Counts', finalStats, 'CLEANUP');

      // Check if cleanup was successful
      const totalRemaining = Object.values(finalStats).reduce((sum: number, count: any) => sum + parseInt(count.toString()), 0);
      
      if (totalRemaining > 0) {
        migrationLogger.warn(`Some records remain after cleanup: ${totalRemaining} total`, 'CLEANUP', finalStats);
      } else {
        migrationLogger.info('✅ Database cleanup completed successfully - all data removed', 'CLEANUP');
      }

      migrationLogger.completePhase('Database Cleanup', {
        initialTotal: Object.values(initialStats).reduce((sum: number, count: any) => sum + parseInt(count.toString()), 0),
        finalTotal: totalRemaining,
        success: totalRemaining === 0
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error('Database cleanup failed', 'CLEANUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Delete all records from a specific table
   */
  private async deleteTable(tableName: string, modelName: string): Promise<void> {
    try {
      migrationLogger.info(`Deleting all records from ${tableName}...`, 'CLEANUP');
      
      // Get count before deletion
      const countBefore = await this.getTableCount(tableName);
      
      if (countBefore === 0) {
        migrationLogger.info(`${tableName} is already empty`, 'CLEANUP');
        return;
      }

      // Delete all records using Prisma
      let deleteCount = 0;
      switch (modelName) {
        case 'User':
          deleteCount = (await db.user.deleteMany({})).count;
          break;
        case 'Account':
          deleteCount = (await db.account.deleteMany({})).count;
          break;
        case 'Session':
          deleteCount = (await db.session.deleteMany({})).count;
          break;
        case 'Studio':
          deleteCount = (await db.studio.deleteMany({})).count;
          break;
        case 'StudioService':
          deleteCount = (await db.studioService.deleteMany({})).count;
          break;
        case 'StudioImage':
          deleteCount = (await db.studioImage.deleteMany({})).count;
          break;
        case 'Review':
          deleteCount = (await db.review.deleteMany({})).count;
          break;
        case 'ReviewResponse':
          deleteCount = (await db.reviewResponse.deleteMany({})).count;
          break;
        case 'Message':
          deleteCount = (await db.message.deleteMany({})).count;
          break;
        case 'UserConnection':
          deleteCount = (await db.userConnection.deleteMany({})).count;
          break;
        case 'Subscription':
          deleteCount = (await db.subscription.deleteMany({})).count;
          break;
        case 'SavedSearch':
          deleteCount = (await db.savedSearch.deleteMany({})).count;
          break;
        case 'PendingSubscription':
          deleteCount = (await db.pendingSubscription.deleteMany({})).count;
          break;
        case 'Refund':
          deleteCount = (await db.refund.deleteMany({})).count;
          break;
        case 'Notification':
          deleteCount = (await db.notification.deleteMany({})).count;
          break;
        case 'ContentReport':
          deleteCount = (await db.contentReport.deleteMany({})).count;
          break;
        case 'UserMetadata':
          deleteCount = (await db.userMetadata.deleteMany({})).count;
          break;
        case 'UserProfile':
          deleteCount = (await db.userProfile.deleteMany({})).count;
          break;
        default:
          migrationLogger.warn(`Unknown model: ${modelName}`, 'CLEANUP');
          return;
      }

      migrationLogger.info(`✅ Deleted ${deleteCount} records from ${tableName}`, 'CLEANUP');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error(`Failed to delete from ${tableName}`, 'CLEANUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get count of records in a specific table
   */
  private async getTableCount(tableName: string): Promise<number> {
    try {
      const result = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
      return parseInt((result as any)[0].count.toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.warn(`Could not get count for ${tableName}`, 'CLEANUP', { error: errorMessage });
      return 0;
    }
  }

  /**
   * Get counts for all main tables
   */
  private async getDatabaseCounts(): Promise<any> {
    try {
      const counts = {
        users: await db.user.count(),
        user_profiles: await db.userProfile.count(),
        user_metadata: await db.userMetadata.count(),
        accounts: await db.account.count(),
        sessions: await db.session.count(),
        studios: await db.studio.count(),
        studio_images: await db.studioImage.count(),
        studio_services: await db.studioService.count(),
        reviews: await db.review.count(),
        review_responses: await db.reviewResponse.count(),
        messages: await db.message.count(),
        user_connections: await db.userConnection.count(),
        subscriptions: await db.subscription.count(),
        saved_searches: await db.savedSearch.count(),
        pending_subscriptions: await db.pendingSubscription.count(),
        refunds: await db.refund.count(),
        notifications: await db.notification.count(),
        content_reports: await db.contentReport.count(),
      };

      return counts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error('Failed to get database counts', 'CLEANUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Verify database schema is intact after cleanup
   */
  async verifySchemaIntegrity(): Promise<boolean> {
    migrationLogger.info('Verifying database schema integrity...', 'CLEANUP');

    try {
      // Test that we can still query the schema
      const tables = await db.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;

      const tableCount = Array.isArray(tables) ? tables.length : 0;
      migrationLogger.info(`✅ Schema verification passed - ${tableCount} tables found`, 'CLEANUP');

      // Test that we can insert a test record (then delete it)
      try {
        const testUser = await db.user.create({
          data: {
            email: 'test@cleanup.com',
            username: 'cleanup-test',
            displayName: 'Cleanup Test',
            role: 'USER',
          }
        });

        await db.user.delete({
          where: { id: testUser.id }
        });

        migrationLogger.info('✅ Schema functionality test passed', 'CLEANUP');
        return true;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        migrationLogger.error('Schema functionality test failed', 'CLEANUP', { error: errorMessage });
        return false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error('Schema verification failed', 'CLEANUP', { error: errorMessage });
      return false;
    }
  }
}

/**
 * CLI entry point for database cleanup
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Cleanup Tool

Usage: npx tsx migration-scripts/backup/database-cleanup.ts [options]

Options:
  --confirm    Confirm that you want to delete all data
  --help, -h   Show this help message

WARNING: This will delete ALL data from the database!
Make sure you have created a backup before running this command.
    `);
    process.exit(0);
  }

  if (!args.includes('--confirm')) {
    console.error('❌ This command will delete ALL data from the database!');
    console.error('   Please run with --confirm flag if you are sure.');
    console.error('   Make sure you have created a backup first.');
    process.exit(1);
  }

  try {
    const cleanup = new DatabaseCleanup();
    await cleanup.cleanAllData();
    
    const schemaOk = await cleanup.verifySchemaIntegrity();
    if (!schemaOk) {
      throw new Error('Schema integrity verification failed');
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('   All data has been removed while preserving the schema.');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ Database cleanup failed:', errorMessage);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default DatabaseCleanup;

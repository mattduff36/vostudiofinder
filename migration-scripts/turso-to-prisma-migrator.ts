#!/usr/bin/env node

import { migrationLogger, LogLevel } from './utils/logger';
import { tursoClient } from './utils/turso-client';
import { idGenerator } from './utils/id-generator';
import { db } from '../src/lib/db';

/**
 * Main Migration Orchestrator
 * Coordinates the complete migration from Turso to Prisma database
 */

export class TursoPrismaMigrator {
  private startTime: Date;
  
  constructor() {
    this.startTime = new Date();
    migrationLogger.info('🚀 Turso to Prisma Migration Started', 'MIGRATOR');
  }

  /**
   * Run the complete migration process
   */
  async migrate(): Promise<void> {
    try {
      migrationLogger.startPhase('Migration Process', 'Complete data migration from Turso to Prisma');

      // Phase 1: Pre-migration checks
      await this.preMigrationChecks();

      // Phase 2: Database preparation
      await this.prepareDatabases();

      // Phase 3: Core data migration
      await this.migrateCoreData();

      // Phase 4: Extended data migration
      await this.migrateExtendedData();

      // Phase 5: Post-migration validation
      await this.postMigrationValidation();

      migrationLogger.completePhase('Migration Process', {
        duration: this.getDuration(),
        summary: migrationLogger.getSummary()
      });

      console.log('\n🎉 Migration completed successfully!');
      this.printSummary();

    } catch (error) {
      migrationLogger.error('Migration failed', 'MIGRATOR', { error: error.message });
      console.error('\n💥 Migration failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Pre-migration checks and setup
   */
  private async preMigrationChecks(): Promise<void> {
    migrationLogger.startPhase('Pre-migration Checks');

    // Test Turso connection
    migrationLogger.info('Testing Turso database connection...', 'CHECK');
    const tursoConnected = await tursoClient.testConnection();
    if (!tursoConnected) {
      throw new Error('Failed to connect to Turso database');
    }

    // Test Prisma connection
    migrationLogger.info('Testing Prisma database connection...', 'CHECK');
    try {
      await db.$queryRaw`SELECT 1`;
      migrationLogger.info('✅ Prisma database connection successful', 'CHECK');
    } catch (error) {
      throw new Error(`Failed to connect to Prisma database: ${error.message}`);
    }

    // Get source data statistics
    const tables = await tursoClient.getTables();
    const userCount = await tursoClient.getRowCount('users');
    const profileCount = await tursoClient.getRowCount('profile');
    const galleryCount = await tursoClient.getRowCount('studio_gallery');
    const messageCount = await tursoClient.getRowCount('messages');
    const contactCount = await tursoClient.getRowCount('shows_contacts');

    migrationLogger.stats('Source Data Statistics', {
      tables: tables.length,
      users: userCount,
      profiles: profileCount,
      gallery: galleryCount,
      messages: messageCount,
      contacts: contactCount
    }, 'CHECK');

    migrationLogger.completePhase('Pre-migration Checks');
  }

  /**
   * Prepare databases for migration
   */
  private async prepareDatabases(): Promise<void> {
    migrationLogger.startPhase('Database Preparation');

    // TODO: Implement database backup
    migrationLogger.info('Database backup will be implemented in Phase 2', 'PREP');

    // TODO: Implement database cleanup
    migrationLogger.info('Database cleanup will be implemented in Phase 2', 'PREP');

    migrationLogger.completePhase('Database Preparation');
  }

  /**
   * Migrate core data (users and profiles)
   */
  private async migrateCoreData(): Promise<void> {
    migrationLogger.startPhase('Core Data Migration');

    // TODO: Implement user migration
    migrationLogger.info('User migration will be implemented in Phase 3', 'CORE');

    // TODO: Implement profile migration
    migrationLogger.info('Profile migration will be implemented in Phase 3', 'CORE');

    migrationLogger.completePhase('Core Data Migration');
  }

  /**
   * Migrate extended data (studios, images, messages)
   */
  private async migrateExtendedData(): Promise<void> {
    migrationLogger.startPhase('Extended Data Migration');

    // TODO: Implement studio migration
    migrationLogger.info('Studio migration will be implemented in Phase 4', 'EXTENDED');

    // TODO: Implement image migration
    migrationLogger.info('Image migration will be implemented in Phase 4', 'EXTENDED');

    // TODO: Implement message migration
    migrationLogger.info('Message migration will be implemented in Phase 4', 'EXTENDED');

    // TODO: Implement connection migration
    migrationLogger.info('Connection migration will be implemented in Phase 4', 'EXTENDED');

    migrationLogger.completePhase('Extended Data Migration');
  }

  /**
   * Post-migration validation
   */
  private async postMigrationValidation(): Promise<void> {
    migrationLogger.startPhase('Post-migration Validation');

    // TODO: Implement validation checks
    migrationLogger.info('Validation checks will be implemented in Phase 5', 'VALIDATION');

    migrationLogger.completePhase('Post-migration Validation');
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    migrationLogger.info('Cleaning up resources...', 'CLEANUP');
    
    try {
      tursoClient.close();
      await db.$disconnect();
      migrationLogger.info('✅ Database connections closed', 'CLEANUP');
    } catch (error) {
      migrationLogger.warn('Error during cleanup', 'CLEANUP', { error: error.message });
    }
  }

  /**
   * Get migration duration
   */
  private getDuration(): string {
    const endTime = new Date();
    const diffMs = endTime.getTime() - this.startTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);
    return `${diffMinutes}m ${diffSeconds}s`;
  }

  /**
   * Print migration summary
   */
  private printSummary(): void {
    const summary = migrationLogger.getSummary();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Duration: ${this.getDuration()}`);
    console.log(`   Log Entries: ${summary.totalEntries}`);
    console.log(`   Warnings: ${summary.warningCount}`);
    console.log(`   Errors: ${summary.errorCount}`);
    console.log(`   Log File: ${summary.logFile}`);
    
    // Export logs
    const exportFile = migrationLogger.exportLogs();
    console.log(`   Exported: ${exportFile}`);
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let logLevel = LogLevel.INFO;
  if (args.includes('--debug')) logLevel = LogLevel.DEBUG;
  if (args.includes('--verbose')) logLevel = LogLevel.DEBUG;
  if (args.includes('--quiet')) logLevel = LogLevel.WARN;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Turso to Prisma Database Migration Tool

Usage: npx tsx migration-scripts/turso-to-prisma-migrator.ts [options]

Options:
  --debug, --verbose    Enable debug logging
  --quiet              Only show warnings and errors
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         Prisma database connection string
  TURSO_DATABASE_URL   Turso database URL
  TURSO_AUTH_TOKEN     Turso authentication token
    `);
    process.exit(0);
  }

  try {
    const migrator = new TursoPrismaMigrator();
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default TursoPrismaMigrator;

#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TursoPrismaMigrator = void 0;
const logger_1 = require("./utils/logger");
const turso_client_1 = require("./utils/turso-client");
const db_1 = require("../src/lib/db");
/**
 * Main Migration Orchestrator
 * Coordinates the complete migration from Turso to Prisma database
 */
class TursoPrismaMigrator {
    constructor() {
        this.startTime = new Date();
        logger_1.migrationLogger.info('🚀 Turso to Prisma Migration Started', 'MIGRATOR');
    }
    /**
     * Run the complete migration process
     */
    async migrate() {
        try {
            logger_1.migrationLogger.startPhase('Migration Process', 'Complete data migration from Turso to Prisma');
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
            logger_1.migrationLogger.completePhase('Migration Process', {
                duration: this.getDuration(),
                summary: logger_1.migrationLogger.getSummary()
            });
            console.log('\n🎉 Migration completed successfully!');
            this.printSummary();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.migrationLogger.error('Migration failed', 'MIGRATOR', { error: errorMessage });
            console.error('\n💥 Migration failed:', errorMessage);
            throw error;
        }
        finally {
            await this.cleanup();
        }
    }
    /**
     * Pre-migration checks and setup
     */
    async preMigrationChecks() {
        logger_1.migrationLogger.startPhase('Pre-migration Checks');
        // Test Turso connection
        logger_1.migrationLogger.info('Testing Turso database connection...', 'CHECK');
        const tursoConnected = await turso_client_1.tursoClient.testConnection();
        if (!tursoConnected) {
            throw new Error('Failed to connect to Turso database');
        }
        // Test Prisma connection
        logger_1.migrationLogger.info('Testing Prisma database connection...', 'CHECK');
        try {
            await db_1.db.$queryRaw `SELECT 1`;
            logger_1.migrationLogger.info('✅ Prisma database connection successful', 'CHECK');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to connect to Prisma database: ${errorMessage}`);
        }
        // Get source data statistics
        const tables = await turso_client_1.tursoClient.getTables();
        const userCount = await turso_client_1.tursoClient.getRowCount('users');
        const profileCount = await turso_client_1.tursoClient.getRowCount('profile');
        const galleryCount = await turso_client_1.tursoClient.getRowCount('studio_gallery');
        const messageCount = await turso_client_1.tursoClient.getRowCount('messages');
        const contactCount = await turso_client_1.tursoClient.getRowCount('shows_contacts');
        logger_1.migrationLogger.stats('Source Data Statistics', {
            tables: tables.length,
            users: userCount,
            profiles: profileCount,
            gallery: galleryCount,
            messages: messageCount,
            contacts: contactCount
        }, 'CHECK');
        logger_1.migrationLogger.completePhase('Pre-migration Checks');
    }
    /**
     * Prepare databases for migration
     */
    async prepareDatabases() {
        logger_1.migrationLogger.startPhase('Database Preparation');
        // TODO: Implement database backup
        logger_1.migrationLogger.info('Database backup will be implemented in Phase 2', 'PREP');
        // TODO: Implement database cleanup
        logger_1.migrationLogger.info('Database cleanup will be implemented in Phase 2', 'PREP');
        logger_1.migrationLogger.completePhase('Database Preparation');
    }
    /**
     * Migrate core data (users and profiles)
     */
    async migrateCoreData() {
        logger_1.migrationLogger.startPhase('Core Data Migration');
        // TODO: Implement user migration
        logger_1.migrationLogger.info('User migration will be implemented in Phase 3', 'CORE');
        // TODO: Implement profile migration
        logger_1.migrationLogger.info('Profile migration will be implemented in Phase 3', 'CORE');
        logger_1.migrationLogger.completePhase('Core Data Migration');
    }
    /**
     * Migrate extended data (studios, images, messages)
     */
    async migrateExtendedData() {
        logger_1.migrationLogger.startPhase('Extended Data Migration');
        // TODO: Implement studio migration
        logger_1.migrationLogger.info('Studio migration will be implemented in Phase 4', 'EXTENDED');
        // TODO: Implement image migration
        logger_1.migrationLogger.info('Image migration will be implemented in Phase 4', 'EXTENDED');
        // TODO: Implement message migration
        logger_1.migrationLogger.info('Message migration will be implemented in Phase 4', 'EXTENDED');
        // TODO: Implement connection migration
        logger_1.migrationLogger.info('Connection migration will be implemented in Phase 4', 'EXTENDED');
        logger_1.migrationLogger.completePhase('Extended Data Migration');
    }
    /**
     * Post-migration validation
     */
    async postMigrationValidation() {
        logger_1.migrationLogger.startPhase('Post-migration Validation');
        // TODO: Implement validation checks
        logger_1.migrationLogger.info('Validation checks will be implemented in Phase 5', 'VALIDATION');
        logger_1.migrationLogger.completePhase('Post-migration Validation');
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        logger_1.migrationLogger.info('Cleaning up resources...', 'CLEANUP');
        try {
            turso_client_1.tursoClient.close();
            await db_1.db.$disconnect();
            logger_1.migrationLogger.info('✅ Database connections closed', 'CLEANUP');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.migrationLogger.warn('Error during cleanup', 'CLEANUP', { error: errorMessage });
        }
    }
    /**
     * Get migration duration
     */
    getDuration() {
        const endTime = new Date();
        const diffMs = endTime.getTime() - this.startTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffSeconds = Math.floor((diffMs % 60000) / 1000);
        return `${diffMinutes}m ${diffSeconds}s`;
    }
    /**
     * Print migration summary
     */
    printSummary() {
        const summary = logger_1.migrationLogger.getSummary();
        console.log('\n📊 Migration Summary:');
        console.log(`   Duration: ${this.getDuration()}`);
        console.log(`   Log Entries: ${summary.totalEntries}`);
        console.log(`   Warnings: ${summary.warningCount}`);
        console.log(`   Errors: ${summary.errorCount}`);
        console.log(`   Log File: ${summary.logFile}`);
        // Export logs
        const exportFile = logger_1.migrationLogger.exportLogs();
        console.log(`   Exported: ${exportFile}`);
    }
}
exports.TursoPrismaMigrator = TursoPrismaMigrator;
/**
 * CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);
    // Parse command line arguments
    // let logLevel = LogLevel.INFO;
    // if (args.includes('--debug')) logLevel = LogLevel.DEBUG;
    // if (args.includes('--verbose')) logLevel = LogLevel.DEBUG;
    // if (args.includes('--quiet')) logLevel = LogLevel.WARN;
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Migration failed:', errorMessage);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
exports.default = TursoPrismaMigrator;

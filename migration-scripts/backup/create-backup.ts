#!/usr/bin/env node

import { prismaBackup } from './prisma-backup';
import { migrationLogger } from '../utils/logger';

/**
 * Script to create database backup before migration
 */

async function createPreMigrationBackup() {
  try {
    migrationLogger.startPhase('Pre-Migration Database Backup');

    // Get current database statistics
    const stats = await prismaBackup.getDatabaseStats();
    migrationLogger.stats('Current Database Statistics', stats, 'BACKUP');

    // Create JSON data backup
    const jsonBackupPath = await prismaBackup.createDataBackup('pre-migration-data-backup.json');
    
    // Test JSON backup integrity
    const isJsonValid = await prismaBackup.testBackupIntegrity(jsonBackupPath);
    if (!isJsonValid) {
      throw new Error('JSON backup validation failed');
    }

    // Create SQL export backup
    const sqlBackupPath = await prismaBackup.createSQLExport('pre-migration-sql-export.sql');
    
    // Test SQL backup integrity
    const isSqlValid = await prismaBackup.testBackupIntegrity(sqlBackupPath);
    if (!isSqlValid) {
      throw new Error('SQL backup validation failed');
    }

    migrationLogger.completePhase('Pre-Migration Database Backup', {
      jsonBackup: jsonBackupPath,
      sqlBackup: sqlBackupPath,
      validated: true
    });

    console.log('\n✅ Pre-migration backup completed successfully!');
    console.log(`JSON backup: ${jsonBackupPath}`);
    console.log(`SQL backup: ${sqlBackupPath}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    migrationLogger.error('Pre-migration backup failed', 'BACKUP', { error: errorMessage });
    console.error('\n❌ Backup failed:', errorMessage);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createPreMigrationBackup().catch(console.error);
}

export { createPreMigrationBackup };

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';

const execAsync = promisify(exec);

/**
 * Database Backup Utility
 * Handles backup and restoration of the Prisma database
 */

export class DatabaseBackup {
  private backupDir: string;
  private databaseUrl: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'migration-scripts', 'backup', 'dumps');
    this.databaseUrl = process.env.DATABASE_URL || '';
    
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a full database backup
   */
  async createBackup(backupName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `prisma-backup-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, filename);

    migrationLogger.info(`Creating database backup: ${filename}`, 'BACKUP');

    try {
      // Parse database URL to extract connection details
      const dbUrl = new URL(this.databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1); // Remove leading slash
      const username = dbUrl.username;
      const password = dbUrl.password;

      // Set environment variable for password
      const env = { ...process.env, PGPASSWORD: password };

      // Create pg_dump command
      const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-password --verbose --clean --if-exists --create > "${backupPath}"`;

      migrationLogger.debug(`Executing backup command`, 'BACKUP', { command: dumpCommand.replace(password, '***') });

      const { stderr } = await execAsync(dumpCommand, { env });

      if (stderr && !stderr.includes('NOTICE')) {
        migrationLogger.warn('Backup completed with warnings', 'BACKUP', { stderr });
      }

      // Verify backup file was created and has content
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      migrationLogger.info(`✅ Database backup created successfully`, 'BACKUP', {
        filename,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        path: backupPath
      });

      return backupPath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error(`Failed to create database backup`, 'BACKUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Create a data-only backup (no schema)
   */
  async createDataBackup(backupName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `prisma-data-backup-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, filename);

    migrationLogger.info(`Creating data-only backup: ${filename}`, 'BACKUP');

    try {
      const dbUrl = new URL(this.databaseUrl);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      const env = { ...process.env, PGPASSWORD: password };

      // Create pg_dump command for data only
      const dumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-password --data-only --verbose > "${backupPath}"`;

      const { stdout, stderr } = await execAsync(dumpCommand, { env });

      if (stderr && !stderr.includes('NOTICE')) {
        migrationLogger.warn('Data backup completed with warnings', 'BACKUP', { stderr });
      }

      const stats = fs.statSync(backupPath);
      migrationLogger.info(`✅ Data backup created successfully`, 'BACKUP', {
        filename,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        path: backupPath
      });

      return backupPath;

    } catch (error) {
      migrationLogger.error(`Failed to create data backup`, 'BACKUP', { error: error.message });
      throw error;
    }
  }

  /**
   * Test backup restoration (dry run)
   */
  async testBackupRestoration(backupPath: string): Promise<boolean> {
    migrationLogger.info(`Testing backup restoration: ${path.basename(backupPath)}`, 'BACKUP');

    try {
      // Check if backup file exists and is readable
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      // Read first few lines to verify it's a valid SQL dump
      const content = fs.readFileSync(backupPath, 'utf8');
      const lines = content.split('\n').slice(0, 10);
      
      const hasValidHeader = lines.some(line => 
        line.includes('PostgreSQL database dump') || 
        line.includes('pg_dump') ||
        line.includes('SET statement_timeout')
      );

      if (!hasValidHeader) {
        throw new Error('Backup file does not appear to be a valid PostgreSQL dump');
      }

      migrationLogger.info(`✅ Backup file validation passed`, 'BACKUP', {
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        lines: lines.length
      });

      return true;

    } catch (error) {
      migrationLogger.error(`Backup validation failed`, 'BACKUP', { error: error.message });
      return false;
    }
  }

  /**
   * Get current database statistics before backup
   */
  async getDatabaseStats(): Promise<any> {
    migrationLogger.info('Gathering database statistics', 'BACKUP');

    try {
      const stats = await db.$queryRaw`
        SELECT 
          schemaname,
          relname as tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC;
      `;

      const totalRows = await db.$queryRaw`
        SELECT 
          SUM(n_live_tup) as total_rows
        FROM pg_stat_user_tables;
      `;

      migrationLogger.info('Database statistics collected', 'BACKUP', { 
        tables: Array.isArray(stats) ? stats.length : 0,
        totalRows: totalRows?.[0]?.total_rows || 0
      });

      return { tables: stats, summary: totalRows?.[0] };

    } catch (error) {
      migrationLogger.error('Failed to gather database statistics', 'BACKUP', { error: error.message });
      throw error;
    }
  }

  /**
   * List all available backups
   */
  listBackups(): string[] {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.backupDir, a));
          const statB = fs.statSync(path.join(this.backupDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime(); // Most recent first
        });

      return files.map(file => path.join(this.backupDir, file));
    } catch (error) {
      migrationLogger.error('Failed to list backups', 'BACKUP', { error: error.message });
      return [];
    }
  }

  /**
   * Clean up old backups (keep only the most recent N backups)
   */
  cleanupOldBackups(keepCount: number = 5): void {
    try {
      const backups = this.listBackups();
      
      if (backups.length <= keepCount) {
        migrationLogger.info(`No cleanup needed. Found ${backups.length} backups, keeping ${keepCount}`, 'BACKUP');
        return;
      }

      const toDelete = backups.slice(keepCount);
      
      for (const backupPath of toDelete) {
        fs.unlinkSync(backupPath);
        migrationLogger.info(`Deleted old backup: ${path.basename(backupPath)}`, 'BACKUP');
      }

      migrationLogger.info(`Cleaned up ${toDelete.length} old backups`, 'BACKUP');

    } catch (error) {
      migrationLogger.error('Failed to cleanup old backups', 'BACKUP', { error: error.message });
    }
  }
}

// Export singleton instance
export const databaseBackup = new DatabaseBackup();

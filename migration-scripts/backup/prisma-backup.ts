import fs from 'fs';
import path from 'path';
import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';

/**
 * Prisma-based Database Backup Utility
 * Alternative backup method using Prisma queries (for systems without pg_dump)
 */

export class PrismaBackup {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'migration-scripts', 'backup', 'dumps');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a data backup using Prisma queries
   */
  async createDataBackup(backupName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `prisma-data-backup-${timestamp}.json`;
    const backupPath = path.join(this.backupDir, filename);

    migrationLogger.info(`Creating Prisma data backup: ${filename}`, 'BACKUP');

    try {
      const backupData: any = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'prisma-backup',
        },
        data: {}
      };

      // Backup all tables with data
      migrationLogger.info('Backing up users...', 'BACKUP');
      backupData.data.users = await db.user.findMany({
        include: {
          profile: true,
          studios: {
            include: {
              images: true,
              services: true,
            }
          },
          metadata: true,
          connections: true,
          connectedBy: true,
        }
      });

      migrationLogger.info('Backing up accounts...', 'BACKUP');
      backupData.data.accounts = await db.account.findMany();

      migrationLogger.info('Backing up sessions...', 'BACKUP');
      backupData.data.sessions = await db.session.findMany();

      migrationLogger.info('Backing up studios...', 'BACKUP');
      backupData.data.studios = await db.studio.findMany({
        include: {
          images: true,
          services: true,
          reviews: true,
        }
      });

      migrationLogger.info('Backing up messages...', 'BACKUP');
      backupData.data.messages = await db.message.findMany();

      migrationLogger.info('Backing up reviews...', 'BACKUP');
      backupData.data.reviews = await db.review.findMany({
        include: {
          response: true,
        }
      });

      migrationLogger.info('Backing up subscriptions...', 'BACKUP');
      backupData.data.subscriptions = await db.subscription.findMany();

      migrationLogger.info('Backing up notifications...', 'BACKUP');
      backupData.data.notifications = await db.notification.findMany();

      // Write backup to file
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      const stats = fs.statSync(backupPath);
      migrationLogger.info(`✅ Prisma data backup created successfully`, 'BACKUP', {
        filename,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        path: backupPath,
        records: {
          users: backupData.data.users.length,
          studios: backupData.data.studios.length,
          messages: backupData.data.messages.length,
          reviews: backupData.data.reviews.length,
        }
      });

      return backupPath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error(`Failed to create Prisma data backup`, 'BACKUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Create a simple SQL export of current data
   */
  async createSQLExport(backupName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `prisma-sql-export-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, filename);

    migrationLogger.info(`Creating SQL export: ${filename}`, 'BACKUP');

    try {
      let sqlContent = `-- Prisma Database Export\n-- Generated: ${new Date().toISOString()}\n\n`;

      // Get table counts for documentation
      const stats = await this.getDatabaseStats();
      sqlContent += `-- Database Statistics:\n`;
      for (const table of stats.tables) {
        sqlContent += `-- ${table.tablename}: ${table.live_tuples} rows\n`;
      }
      sqlContent += `\n`;

      // Export users
      const users = await db.user.findMany();
      if (users.length > 0) {
        sqlContent += `-- Users (${users.length} records)\n`;
        for (const user of users) {
          sqlContent += `INSERT INTO users (id, email, username, display_name, avatar_url, role, email_verified, password, created_at, updated_at) VALUES `;
          sqlContent += `('${user.id}', '${user.email}', '${user.username}', '${user.displayName}', ${user.avatarUrl ? `'${user.avatarUrl}'` : 'NULL'}, '${user.role}', ${user.emailVerified}, ${user.password ? `'${user.password}'` : 'NULL'}, '${user.createdAt.toISOString()}', '${user.updatedAt.toISOString()}');\n`;
        }
        sqlContent += `\n`;
      }

      // Export user profiles
      const profiles = await db.userProfile.findMany();
      if (profiles.length > 0) {
        sqlContent += `-- User Profiles (${profiles.length} records)\n`;
        for (const profile of profiles) {
          sqlContent += `INSERT INTO user_profiles (id, user_id, first_name, last_name, phone, about, short_about, location, created_at, updated_at) VALUES `;
          sqlContent += `('${profile.id}', '${profile.userId}', ${profile.firstName ? `'${profile.firstName.replace(/'/g, "''")}'` : 'NULL'}, ${profile.lastName ? `'${profile.lastName.replace(/'/g, "''")}'` : 'NULL'}, ${profile.phone ? `'${profile.phone}'` : 'NULL'}, ${profile.about ? `'${profile.about.replace(/'/g, "''")}'` : 'NULL'}, ${profile.shortAbout ? `'${profile.shortAbout.replace(/'/g, "''")}'` : 'NULL'}, ${profile.location ? `'${profile.location.replace(/'/g, "''")}'` : 'NULL'}, '${profile.createdAt.toISOString()}', '${profile.updatedAt.toISOString()}');\n`;
        }
        sqlContent += `\n`;
      }

      // Write SQL to file
      fs.writeFileSync(backupPath, sqlContent);

      const stats_file = fs.statSync(backupPath);
      migrationLogger.info(`✅ SQL export created successfully`, 'BACKUP', {
        filename,
        size: `${(stats_file.size / 1024).toFixed(2)} KB`,
        path: backupPath
      });

      return backupPath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error(`Failed to create SQL export`, 'BACKUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
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

      return { tables: stats, summary: Array.isArray(totalRows) && totalRows.length > 0 ? totalRows[0] : null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error('Failed to gather database statistics', 'BACKUP', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Test backup integrity
   */
  async testBackupIntegrity(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      if (backupPath.endsWith('.json')) {
        // Test JSON backup
        const content = fs.readFileSync(backupPath, 'utf8');
        const data = JSON.parse(content);
        
        if (!data.metadata || !data.data) {
          throw new Error('Invalid backup format');
        }

        migrationLogger.info(`✅ JSON backup validation passed`, 'BACKUP', {
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          users: data.data.users?.length || 0,
          studios: data.data.studios?.length || 0
        });
      } else if (backupPath.endsWith('.sql')) {
        // Test SQL backup
        const content = fs.readFileSync(backupPath, 'utf8');
        if (!content.includes('INSERT INTO') && !content.includes('CREATE TABLE')) {
          throw new Error('SQL backup appears to be empty or invalid');
        }

        migrationLogger.info(`✅ SQL backup validation passed`, 'BACKUP', {
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          lines: content.split('\n').length
        });
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      migrationLogger.error(`Backup validation failed`, 'BACKUP', { error: errorMessage });
      return false;
    }
  }
}

export const prismaBackup = new PrismaBackup();

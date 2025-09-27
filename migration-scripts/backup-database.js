#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * This script creates a backup of the current Prisma database before
 * making schema changes for the admin site merge.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class DatabaseBackup {
  constructor() {
    this.db = new PrismaClient();
    this.backupDir = path.join(__dirname, 'backup');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async backup() {
    console.log('💾 Starting database backup...');
    
    try {
      // Create backup directory
      await this.createBackupDirectory();
      
      // Test database connection
      await this.testConnection();
      
      // Backup all tables
      await this.backupUsers();
      await this.backupStudios();
      await this.backupReviews();
      await this.backupMessages();
      await this.backupSubscriptions();
      await this.backupNotifications();
      await this.backupContentReports();
      await this.backupUserProfiles();
      await this.backupUserMetadata();
      
      // Create backup manifest
      await this.createBackupManifest();
      
      console.log('✅ Database backup completed successfully!');
      
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async createBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async testConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
      await this.db.$queryRaw`SELECT 1`;
      console.log('✅ Database connection successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async backupUsers() {
    console.log('👥 Backing up users...');
    
    const users = await this.db.user.findMany({
      include: {
        accounts: true,
        sessions: true,
        profile: true,
        metadata: true
      }
    });

    const backupFile = path.join(this.backupDir, `users-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(users, null, 2));
    
    console.log(`✅ Backed up ${users.length} users to ${backupFile}`);
  }

  async backupStudios() {
    console.log('🏢 Backing up studios...');
    
    const studios = await this.db.studio.findMany({
      include: {
        images: true,
        services: true,
        reviews: true,
        owner: true
      }
    });

    const backupFile = path.join(this.backupDir, `studios-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(studios, null, 2));
    
    console.log(`✅ Backed up ${studios.length} studios to ${backupFile}`);
  }

  async backupReviews() {
    console.log('⭐ Backing up reviews...');
    
    const reviews = await this.db.review.findMany({
      include: {
        response: true,
        reviewer: true,
        owner: true,
        studio: true
      }
    });

    const backupFile = path.join(this.backupDir, `reviews-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(reviews, null, 2));
    
    console.log(`✅ Backed up ${reviews.length} reviews to ${backupFile}`);
  }

  async backupMessages() {
    console.log('💬 Backing up messages...');
    
    const messages = await this.db.message.findMany({
      include: {
        sender: true,
        receiver: true
      }
    });

    const backupFile = path.join(this.backupDir, `messages-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(messages, null, 2));
    
    console.log(`✅ Backed up ${messages.length} messages to ${backupFile}`);
  }

  async backupSubscriptions() {
    console.log('💳 Backing up subscriptions...');
    
    const subscriptions = await this.db.subscription.findMany({
      include: {
        user: true
      }
    });

    const backupFile = path.join(this.backupDir, `subscriptions-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(subscriptions, null, 2));
    
    console.log(`✅ Backed up ${subscriptions.length} subscriptions to ${backupFile}`);
  }

  async backupNotifications() {
    console.log('🔔 Backing up notifications...');
    
    const notifications = await this.db.notification.findMany({
      include: {
        user: true
      }
    });

    const backupFile = path.join(this.backupDir, `notifications-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(notifications, null, 2));
    
    console.log(`✅ Backed up ${notifications.length} notifications to ${backupFile}`);
  }

  async backupContentReports() {
    console.log('📋 Backing up content reports...');
    
    const contentReports = await this.db.contentReport.findMany({
      include: {
        reporter: true,
        reportedUser: true,
        reviewedBy: true
      }
    });

    const backupFile = path.join(this.backupDir, `content-reports-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(contentReports, null, 2));
    
    console.log(`✅ Backed up ${contentReports.length} content reports to ${backupFile}`);
  }

  async backupUserProfiles() {
    console.log('👤 Backing up user profiles...');
    
    const userProfiles = await this.db.userProfile.findMany({
      include: {
        user: true
      }
    });

    const backupFile = path.join(this.backupDir, `user-profiles-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(userProfiles, null, 2));
    
    console.log(`✅ Backed up ${userProfiles.length} user profiles to ${backupFile}`);
  }

  async backupUserMetadata() {
    console.log('📊 Backing up user metadata...');
    
    const userMetadata = await this.db.userMetadata.findMany({
      include: {
        user: true
      }
    });

    const backupFile = path.join(this.backupDir, `user-metadata-${this.timestamp}.json`);
    await fs.writeFile(backupFile, JSON.stringify(userMetadata, null, 2));
    
    console.log(`✅ Backed up ${userMetadata.length} user metadata entries to ${backupFile}`);
  }

  async createBackupManifest() {
    console.log('📄 Creating backup manifest...');
    
    const manifest = {
      timestamp: this.timestamp,
      backupDate: new Date().toISOString(),
      description: 'Database backup before admin site merge schema changes',
      tables: [
        'users',
        'studios', 
        'reviews',
        'messages',
        'subscriptions',
        'notifications',
        'content-reports',
        'user-profiles',
        'user-metadata'
      ],
      backupDirectory: this.backupDir,
      totalFiles: 9
    };

    const manifestFile = path.join(this.backupDir, `manifest-${this.timestamp}.json`);
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Created backup manifest: ${manifestFile}`);
  }

  async cleanup() {
    await this.db.$disconnect();
  }
}

// Run backup if called directly
if (require.main === module) {
  const backup = new DatabaseBackup();
  backup.backup()
    .then(() => {
      console.log('Database backup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database backup failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseBackup;

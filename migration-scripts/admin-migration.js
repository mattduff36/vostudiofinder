#!/usr/bin/env node

/**
 * Admin Migration Script
 * 
 * This script handles the migration of admin-specific data and configurations
 * from the vosf-old-site to the unified vostudiofinder application.
 */

import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

class AdminMigrator {
  constructor() {
    this.db = new PrismaClient();
    this.migrationLog = [];
  }

  async migrate() {
    console.log('🔧 Starting admin migration...');
    
    try {
      // Test database connection
      await this.testConnection();
      
      // Migrate admin configurations
      await this.migrateAdminConfigurations();
      
      // Migrate admin user roles
      await this.migrateAdminRoles();
      
      // Create admin-specific data
      await this.createAdminData();
      
      // Print migration summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Admin migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
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

  async migrateAdminConfigurations() {
    console.log('⚙️  Migrating admin configurations...');
    
    // Create default admin configurations
    const adminConfigs = [
      {
        key: 'site_name',
        value: 'VoiceoverStudioFinder',
        description: 'Main site name'
      },
      {
        key: 'admin_email',
        value: 'admin@vostudiofinder.com',
        description: 'Admin contact email'
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Site maintenance mode'
      },
      {
        key: 'registration_enabled',
        value: 'true',
        description: 'User registration enabled'
      },
      {
        key: 'studio_approval_required',
        value: 'true',
        description: 'Studio approval required'
      }
    ];

    for (const config of adminConfigs) {
      try {
        // Check if configuration already exists
        const existing = await this.db.userMetadata.findFirst({
          where: {
            key: `admin_config_${config.key}`,
            user: {
              role: 'ADMIN'
            }
          }
        });

        if (!existing) {
          // Find the first admin user to attach the config to
          const adminUser = await this.db.user.findFirst({
            where: { role: 'ADMIN' }
          });

          if (adminUser) {
            await this.db.userMetadata.create({
              data: {
                userId: adminUser.id,
                key: `admin_config_${config.key}`,
                value: config.value
              }
            });

            this.migrationLog.push(`✅ Created admin config: ${config.key}`);
          }
        } else {
          this.migrationLog.push(`⚠️  Admin config already exists: ${config.key}`);
        }
      } catch (error) {
        this.migrationLog.push(`❌ Failed to create admin config ${config.key}: ${error.message}`);
      }
    }
  }

  async migrateAdminRoles() {
    console.log('👑 Migrating admin roles...');
    
    // Ensure we have at least one admin user
    const adminCount = await this.db.user.count({
      where: { role: 'ADMIN' }
    });

    if (adminCount === 0) {
      console.log('⚠️  No admin users found. Creating default admin user...');
      
      try {
        const defaultAdmin = await this.db.user.create({
          data: {
            email: 'admin@vostudiofinder.com',
            username: 'admin',
            displayName: 'System Administrator',
            role: 'ADMIN',
            emailVerified: true,
            password: '$2a$10$dummy.hash.for.default.admin' // This should be changed
          }
        });

        this.migrationLog.push(`✅ Created default admin user: ${defaultAdmin.email}`);
      } catch (error) {
        this.migrationLog.push(`❌ Failed to create default admin user: ${error.message}`);
      }
    } else {
      this.migrationLog.push(`✅ Found ${adminCount} existing admin users`);
    }
  }

  async createAdminData() {
    console.log('📊 Creating admin-specific data...');
    
    // Create default FAQ entries if none exist
    const faqCount = await this.db.faq.count();
    
    if (faqCount === 0) {
      const defaultFaqs = [
        {
          question: 'How do I list my studio?',
          answer: 'You can list your studio by creating an account and filling out the studio listing form.',
          sortOrder: 1
        },
        {
          question: 'What are the pricing tiers?',
          answer: 'We offer different pricing tiers for studio listings. Contact us for more information.',
          sortOrder: 2
        },
        {
          question: 'How do I contact a studio owner?',
          answer: 'You can contact studio owners through our messaging system after creating an account.',
          sortOrder: 3
        }
      ];

      for (const faq of defaultFaqs) {
        try {
          await this.db.faq.create({
            data: faq
          });
          this.migrationLog.push(`✅ Created default FAQ: ${faq.question}`);
        } catch (error) {
          this.migrationLog.push(`❌ Failed to create FAQ: ${error.message}`);
        }
      }
    } else {
      this.migrationLog.push(`✅ Found ${faqCount} existing FAQ entries`);
    }

    // Create default POI entries if none exist
    const poiCount = await this.db.poi.count();
    
    if (poiCount === 0) {
      const defaultPois = [
        {
          name: 'London Voiceover Studios',
          description: 'Central London voiceover recording studios',
          latitude: 51.5074,
          longitude: -0.1278,
          address: 'London, UK',
          category: 'studio'
        },
        {
          name: 'New York Voiceover Studios',
          description: 'New York City voiceover recording studios',
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY, USA',
          category: 'studio'
        }
      ];

      for (const poi of defaultPois) {
        try {
          await this.db.poi.create({
            data: poi
          });
          this.migrationLog.push(`✅ Created default POI: ${poi.name}`);
        } catch (error) {
          this.migrationLog.push(`❌ Failed to create POI: ${error.message}`);
        }
      }
    } else {
      this.migrationLog.push(`✅ Found ${poiCount} existing POI entries`);
    }
  }

  printSummary() {
    console.log('\n📊 Admin Migration Summary:');
    console.log('============================');
    
    this.migrationLog.forEach(log => {
      console.log(log);
    });
    
    const successCount = this.migrationLog.filter(log => log.startsWith('✅')).length;
    const errorCount = this.migrationLog.filter(log => log.startsWith('❌')).length;
    
    console.log(`\nTotal: ${successCount} successful, ${errorCount} errors`);
    
    if (errorCount === 0) {
      console.log('🎉 Admin migration completed successfully!');
    } else {
      console.log('⚠️  Admin migration completed with errors. Please review the logs.');
    }
  }

  async cleanup() {
    await this.db.$disconnect();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new AdminMigrator();
  migrator.migrate()
    .then(() => {
      console.log('Admin migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin migration failed:', error);
      process.exit(1);
    });
}

export default AdminMigrator;

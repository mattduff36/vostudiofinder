#!/usr/bin/env node

/**
 * Create Admin User Script
 * 
 * This script creates an admin user in the database for the unified
 * authentication system.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

class AdminUserCreator {
  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@vostudiofinder.com';
    this.adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
  }

  async createAdminUser() {
    console.log('👑 Creating admin user...');
    
    try {
      // Test database connection
      await this.testConnection();
      
      // Check if admin user already exists
      const existingAdmin = await db.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (existingAdmin) {
        console.log(`⚠️  Admin user already exists: ${existingAdmin.email}`);
        console.log('✅ Admin user setup completed');
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(this.adminPassword, 12);

      // Create admin user
      const adminUser = await db.user.create({
        data: {
          email: this.adminEmail,
          username: this.adminUsername,
          displayName: 'System Administrator',
          role: 'ADMIN',
          emailVerified: true,
          password: hashedPassword
        }
      });

      console.log(`✅ Admin user created successfully:`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   ID: ${adminUser.id}`);

      // Create admin profile
      await this.createAdminProfile(adminUser.id);

      console.log('🎉 Admin user setup completed successfully!');

    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async testConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('✅ Database connection successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createAdminProfile(userId) {
    console.log('👤 Creating admin profile...');
    
    try {
      const adminProfile = await db.userProfile.create({
        data: {
          userId: userId,
          studioName: 'VOSF Administration',
          about: 'System Administrator for VoiceoverStudioFinder',
          location: 'System',
          isFeatured: true,
          isSpotlight: true,
          verificationLevel: 'premium',
          showEmail: true,
          showPhone: true,
          showAddress: true
        }
      });

      console.log(`✅ Admin profile created: ${adminProfile.id}`);

    } catch (error) {
      console.error('❌ Failed to create admin profile:', error);
      throw error;
    }
  }

  async cleanup() {
    await db.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const creator = new AdminUserCreator();
  creator.createAdminUser()
    .then(() => {
      console.log('Admin user creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin user creation failed:', error);
      process.exit(1);
    });
}

export default AdminUserCreator;

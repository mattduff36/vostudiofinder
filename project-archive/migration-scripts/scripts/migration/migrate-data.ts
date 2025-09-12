#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { LegacyDatabase } from '../../src/lib/migration/legacy-db';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const legacyDb = new LegacyDatabase();

interface MigrationStats {
  users: { total: number; migrated: number; skipped: number; errors: number };
  studios: { total: number; migrated: number; skipped: number; errors: number };
  reviews: { total: number; migrated: number; skipped: number; errors: number };
}

async function migrateUsers() {
  console.log('🔄 Migrating users...');
  
  const legacyUsers = await legacyDb.getUsers();
  const stats = { total: legacyUsers.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const legacyUser of legacyUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: legacyUser.email },
      });
      
      if (existingUser) {
        stats.skipped++;
        continue;
      }
      
      // Generate username from email if not provided
      let username = legacyUser.username || legacyUser.email.split('@')[0];
      
      // Ensure username is unique
      let usernameCounter = 1;
      const baseUsername = username;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${usernameCounter}`;
        usernameCounter++;
      }
      
      // Hash password if it exists (some users might be OAuth-only)
      let hashedPassword = null;
      if (legacyUser.password) {
        // Legacy passwords might already be hashed, check format
        if (legacyUser.password.startsWith('$2') && legacyUser.password.length === 60) {
          hashedPassword = legacyUser.password; // Already bcrypt hashed
        } else {
          hashedPassword = await bcrypt.hash(legacyUser.password, 12);
        }
      }
      
      await prisma.user.create({
        data: {
          id: `legacy_${legacyUser.id}`, // Prefix to avoid ID conflicts
          email: legacyUser.email,
          username,
          displayName: legacyUser.display_name || legacyUser.username || 'User',
          password: hashedPassword,
          avatarUrl: legacyUser.avatar_url,
          role: mapUserRole(legacyUser.role),
          emailVerified: Boolean(legacyUser.email_verified),
          createdAt: new Date(legacyUser.created_at),
          updatedAt: new Date(legacyUser.updated_at || legacyUser.created_at),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating user ${legacyUser.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateStudios() {
  console.log('🔄 Migrating studios...');
  
  const legacyStudios = await legacyDb.getStudios();
  const stats = { total: legacyStudios.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const legacyStudio of legacyStudios) {
    try {
      // Find the migrated user
      const owner = await prisma.user.findUnique({
        where: { id: `legacy_${legacyStudio.owner_id}` },
      });
      
      if (!owner) {
        console.warn(`Owner not found for studio ${legacyStudio.id}, skipping...`);
        stats.skipped++;
        continue;
      }
      
      // Check if studio already exists
      const existingStudio = await prisma.studio.findFirst({
        where: { 
          name: legacyStudio.name,
          ownerId: owner.id,
        },
      });
      
      if (existingStudio) {
        stats.skipped++;
        continue;
      }
      
      await prisma.studio.create({
        data: {
          id: `legacy_${legacyStudio.id}`,
          ownerId: owner.id,
          name: legacyStudio.name,
          description: legacyStudio.description || '',
          studioType: mapStudioType(legacyStudio.studio_type),
          address: legacyStudio.address || '',
          latitude: legacyStudio.loc3 ? parseFloat(legacyStudio.loc3) : null,
          longitude: legacyStudio.loc4 ? parseFloat(legacyStudio.loc4) : null,
          websiteUrl: legacyStudio.website_url,
          phone: legacyStudio.phone,
          isPremium: Boolean(legacyStudio.is_premium),
          isVerified: Boolean(legacyStudio.is_verified),
          status: mapStudioStatus(legacyStudio.status),
          createdAt: new Date(legacyStudio.created_at),
          updatedAt: new Date(legacyStudio.updated_at || legacyStudio.created_at),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating studio ${legacyStudio.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateReviews() {
  console.log('🔄 Migrating reviews...');
  
  const legacyReviews = await legacyDb.getReviews();
  const stats = { total: legacyReviews.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const legacyReview of legacyReviews) {
    try {
      // Find the migrated user and studio
      const reviewer = await prisma.user.findUnique({
        where: { id: `legacy_${legacyReview.reviewer_id}` },
      });
      
      const studio = await prisma.studio.findUnique({
        where: { id: `legacy_${legacyReview.studio_id}` },
        include: { owner: true },
      });
      
      if (!reviewer || !studio) {
        stats.skipped++;
        continue;
      }
      
      // Check if review already exists
      const existingReview = await prisma.review.findFirst({
        where: {
          reviewerId: reviewer.id,
          studioId: studio.id,
        },
      });
      
      if (existingReview) {
        stats.skipped++;
        continue;
      }
      
      await prisma.review.create({
        data: {
          id: `legacy_${legacyReview.id}`,
          reviewerId: reviewer.id,
          studioId: studio.id,
          ownerId: studio.ownerId,
          rating: legacyReview.rating || 5, // Default to 5 if no rating
          content: legacyReview.content,
          status: mapReviewStatus(legacyReview.status),
          createdAt: new Date(legacyReview.date),
          updatedAt: new Date(legacyReview.updated_at || legacyReview.date),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating review ${legacyReview.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

function mapUserRole(legacyRole: string): 'USER' | 'STUDIO_OWNER' | 'ADMIN' {
  switch (legacyRole?.toLowerCase()) {
    case 'admin':
    case 'administrator':
      return 'ADMIN';
    case 'studio_owner':
    case 'owner':
      return 'STUDIO_OWNER';
    default:
      return 'USER';
  }
}

function mapStudioType(legacyType: string): 'RECORDING' | 'PODCAST' | 'HOME' | 'PRODUCTION' | 'MOBILE' {
  switch (legacyType?.toLowerCase()) {
    case 'podcast':
      return 'PODCAST';
    case 'home':
      return 'HOME';
    case 'production':
      return 'PRODUCTION';
    case 'mobile':
      return 'MOBILE';
    default:
      return 'RECORDING';
  }
}

function mapStudioStatus(legacyStatus: string): 'ACTIVE' | 'INACTIVE' | 'DRAFT' {
  switch (legacyStatus?.toLowerCase()) {
    case 'inactive':
    case 'disabled':
      return 'INACTIVE';
    case 'draft':
      return 'DRAFT';
    default:
      return 'ACTIVE';
  }
}

function mapReviewStatus(legacyStatus: string): 'PENDING' | 'APPROVED' | 'REJECTED' {
  switch (legacyStatus?.toLowerCase()) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
    case 'spam':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
}

async function main() {
  console.log('🚀 Starting data migration from legacy MySQL database...\n');
  
  try {
    // Validate legacy database connection
    console.log('🔍 Validating legacy database...');
    const validation = await legacyDb.validateDatabase();
    
    if (!validation.valid) {
      throw new Error(`Legacy database validation failed: ${validation.error}`);
    }
    
    console.log('✅ Legacy database validated');
    console.log('📊 Legacy database counts:', validation.counts);
    console.log();
    
    // Perform migrations
    const stats: MigrationStats = {
      users: await migrateUsers(),
      studios: await migrateStudios(),
      reviews: await migrateReviews(),
    };
    
    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    
    Object.entries(stats).forEach(([type, stat]) => {
      console.log(`${type.toUpperCase()}:`);
      console.log(`  Total: ${stat.total}`);
      console.log(`  Migrated: ${stat.migrated}`);
      console.log(`  Skipped: ${stat.skipped}`);
      console.log(`  Errors: ${stat.errors}`);
      console.log();
    });
    
    const totalMigrated = Object.values(stats).reduce((sum, stat) => sum + stat.migrated, 0);
    const totalErrors = Object.values(stats).reduce((sum, stat) => sum + stat.errors, 0);
    
    if (totalErrors === 0) {
      console.log(`✅ Migration completed successfully! Migrated ${totalMigrated} records.`);
    } else {
      console.log(`⚠️  Migration completed with ${totalErrors} errors. ${totalMigrated} records migrated.`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await legacyDb.disconnect();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

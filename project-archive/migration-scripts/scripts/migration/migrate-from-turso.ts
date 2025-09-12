#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { TursoDatabase } from '../../src/lib/migration/turso-db';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const tursoDb = new TursoDatabase();

interface MigrationStats {
  users: { total: number; migrated: number; skipped: number; errors: number };
  studios: { total: number; migrated: number; skipped: number; errors: number };
  reviews: { total: number; migrated: number; skipped: number; errors: number };
}

async function migrateUsers() {
  console.log('🔄 Migrating users from Turso...');
  
  const tursoUsers = await tursoDb.getUsers();
  const stats = { total: tursoUsers.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const tursoUser of tursoUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: tursoUser.email },
      });
      
      if (existingUser) {
        stats.skipped++;
        continue;
      }
      
      // Generate username from email if not provided
      let username = tursoUser.username || tursoUser.email.split('@')[0];
      
      // Ensure username is unique
      let usernameCounter = 1;
      const baseUsername = username;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${usernameCounter}`;
        usernameCounter++;
      }
      
      // Hash password if it exists (some users might be OAuth-only)
      let hashedPassword = null;
      if (tursoUser.password) {
        // Legacy passwords might already be hashed, check format
        if (tursoUser.password.startsWith('$2') && tursoUser.password.length === 60) {
          hashedPassword = tursoUser.password; // Already bcrypt hashed
        } else {
          hashedPassword = await bcrypt.hash(tursoUser.password, 12);
        }
      }
      
      await prisma.user.create({
        data: {
          id: `turso_${tursoUser.id}`, // Prefix to avoid ID conflicts
          email: tursoUser.email,
          username,
          displayName: tursoUser.display_name || tursoUser.username || 'User',
          password: hashedPassword,
          avatarUrl: tursoUser.avatar_url,
          role: mapUserRole(tursoUser.role_id),
          emailVerified: Boolean(tursoUser.email_verified),
          createdAt: new Date(tursoUser.created_at),
          updatedAt: new Date(tursoUser.updated_at || tursoUser.created_at),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating user ${tursoUser.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateStudios() {
  console.log('🔄 Migrating studios from Turso...');
  
  const tursoStudios = await tursoDb.getStudios();
  const allUserMeta = await tursoDb.getAllUserMeta();
  const stats = { total: tursoStudios.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const tursoStudio of tursoStudios) {
    try {
      // Find the migrated user
      const owner = await prisma.user.findUnique({
        where: { id: `turso_${tursoStudio.owner_id}` },
      });
      
      if (!owner) {
        console.warn(`Owner not found for studio ${tursoStudio.id}, skipping...`);
        stats.skipped++;
        continue;
      }
      
      // Get user metadata for this studio
      const userMeta = allUserMeta[tursoStudio.id] || {};
      
      // Create studio name from display name or username
      const studioName = tursoStudio.name || tursoStudio.username || `Studio ${tursoStudio.id}`;
      
      // Check if studio already exists
      const existingStudio = await prisma.studio.findFirst({
        where: { 
          name: studioName,
          ownerId: owner.id,
        },
      });
      
      if (existingStudio) {
        stats.skipped++;
        continue;
      }
      
      // Extract relevant metadata
      const description = userMeta.description || userMeta.bio || userMeta.about || '';
      const address = userMeta.address || userMeta.location || '';
      const phone = userMeta.phone || userMeta.telephone || '';
      const website = userMeta.website || userMeta.url || '';
      const latitude = userMeta.latitude ? parseFloat(userMeta.latitude) : null;
      const longitude = userMeta.longitude ? parseFloat(userMeta.longitude) : null;
      
      await prisma.studio.create({
        data: {
          id: `turso_${tursoStudio.id}`,
          ownerId: owner.id,
          name: studioName,
          description: description,
          studioType: 'RECORDING', // Default type
          address: address,
          latitude: latitude,
          longitude: longitude,
          websiteUrl: website || null,
          phone: phone || null,
          isPremium: Boolean(userMeta.premium || userMeta.is_premium),
          isVerified: Boolean(userMeta.verified || userMeta.is_verified),
          status: 'ACTIVE',
          createdAt: new Date(tursoStudio.created_at),
          updatedAt: new Date(tursoStudio.updated_at || tursoStudio.created_at),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating studio ${tursoStudio.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateReviews() {
  console.log('🔄 Migrating reviews from Turso...');
  
  const tursoReviews = await tursoDb.getReviews();
  const stats = { total: tursoReviews.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const tursoReview of tursoReviews) {
    try {
      // Find the migrated user and studio
      const reviewer = await prisma.user.findUnique({
        where: { id: `turso_${tursoReview.reviewer_id}` },
      });
      
      const studio = await prisma.studio.findUnique({
        where: { id: `turso_${tursoReview.studio_id}` },
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
          id: `turso_${tursoReview.id}`,
          reviewerId: reviewer.id,
          studioId: studio.id,
          ownerId: studio.ownerId,
          rating: tursoReview.rating || 5, // Default to 5 if no rating
          content: tursoReview.content,
          status: 'APPROVED', // All migrated reviews are approved
          createdAt: new Date(tursoReview.date),
          updatedAt: new Date(tursoReview.updated || tursoReview.date),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating review ${tursoReview.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

function mapUserRole(roleId: number): 'USER' | 'STUDIO_OWNER' | 'ADMIN' {
  switch (roleId) {
    case 1:
      return 'ADMIN';
    case 2:
      return 'STUDIO_OWNER';
    default:
      return 'USER';
  }
}

function mapStudioType(tursoType: string): 'RECORDING' | 'PODCAST' | 'HOME' | 'PRODUCTION' | 'MOBILE' {
  switch (tursoType?.toLowerCase()) {
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

function mapStudioStatus(tursoStatus: string): 'ACTIVE' | 'INACTIVE' | 'DRAFT' {
  switch (tursoStatus?.toLowerCase()) {
    case 'inactive':
    case 'disabled':
      return 'INACTIVE';
    case 'draft':
      return 'DRAFT';
    default:
      return 'ACTIVE';
  }
}

function mapReviewStatus(tursoStatus: string): 'PENDING' | 'APPROVED' | 'REJECTED' {
  switch (tursoStatus?.toLowerCase()) {
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
  console.log('🚀 Starting data migration from Turso database...\n');
  
  try {
    // Validate Turso database connection
    console.log('🔍 Validating Turso database...');
    const validation = await tursoDb.validateDatabase();
    
    if (!validation.valid) {
      throw new Error(`Turso database validation failed: ${validation.error}`);
    }
    
    console.log('✅ Turso database validated');
    console.log('📊 Turso database counts:', validation.counts);
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
    await tursoDb.disconnect();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { TursoDatabase } from '../../src/lib/migration/turso-db';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const tursoDb = new TursoDatabase();

interface EnhancedMigrationStats {
  users: { total: number; migrated: number; skipped: number; errors: number };
  studios: { total: number; migrated: number; skipped: number; errors: number };
  userConnections: { total: number; migrated: number; skipped: number; errors: number };
  studioImages: { total: number; migrated: number; skipped: number; errors: number };
  reviews: { total: number; migrated: number; skipped: number; errors: number };
  metadata: { total: number; processed: number; errors: number };
}

async function clearExistingData() {
  console.log('🗑️ Clearing existing data...');
  
  try {
    // Delete in correct order to respect foreign key constraints
    await prisma.reviewResponse.deleteMany();
    await prisma.review.deleteMany();
    await prisma.studioImage.deleteMany();
    await prisma.studioService.deleteMany();
    await prisma.studio.deleteMany();
    await prisma.userConnection.deleteMany();
    await prisma.message.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.savedSearch.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.pendingSubscription.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.contentReport.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Existing data cleared');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

async function migrateUsersEnhanced() {
  console.log('🔄 Migrating users with enhanced data...');
  
  const tursoUsers = await tursoDb.getUsers();
  const allUserMeta = await tursoDb.getAllUserMeta();
  const stats = { total: tursoUsers.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const tursoUser of tursoUsers) {
    try {
      // Get user metadata
      const userMeta = allUserMeta[tursoUser.id] || {};
      
      // Generate username from email if not provided
      let username = tursoUser.username || tursoUser.email.split('@')[0];
      
      // Ensure username is unique
      let usernameCounter = 1;
      const baseUsername = username;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${usernameCounter}`;
        usernameCounter++;
      }
      
      // Hash password if it exists
      let hashedPassword = null;
      if (tursoUser.password) {
        if (tursoUser.password.startsWith('$2') && tursoUser.password.length === 60) {
          hashedPassword = tursoUser.password; // Already bcrypt hashed
        } else {
          hashedPassword = await bcrypt.hash(tursoUser.password, 12);
        }
      }
      
      // Create enhanced display name
      const firstName = userMeta.first_name || '';
      const lastName = userMeta.last_name || '';
      const displayName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : tursoUser.display_name || tursoUser.username || 'User';
      
      // Determine avatar URL (prioritize Cloudinary URLs from metadata)
      let avatarUrl = tursoUser.avatar_url;
      if (userMeta.avatar_image && userMeta.avatar_image.includes('cloudinary')) {
        avatarUrl = userMeta.avatar_image;
      } else if (userMeta.facebook_avatar) {
        avatarUrl = userMeta.facebook_avatar;
      } else if (userMeta.google_avatar) {
        avatarUrl = userMeta.google_avatar;
      } else if (userMeta.twitter_avatar) {
        avatarUrl = userMeta.twitter_avatar;
      }
      
      await prisma.user.create({
        data: {
          id: `turso_${tursoUser.id}`,
          email: tursoUser.email,
          username,
          displayName,
          password: hashedPassword,
          avatarUrl,
          role: mapUserRole(tursoUser.role_id),
          emailVerified: Boolean(tursoUser.email_verified || userMeta.verified),
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

async function migrateStudiosEnhanced() {
  console.log('🔄 Migrating studios with enhanced metadata...');
  
  const tursoUsers = await tursoDb.getUsers();
  const allUserMeta = await tursoDb.getAllUserMeta();
  const stats = { total: tursoUsers.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const tursoUser of tursoUsers) {
    try {
      // Find the migrated user
      const owner = await prisma.user.findUnique({
        where: { id: `turso_${tursoUser.id}` },
      });
      
      if (!owner) {
        stats.skipped++;
        continue;
      }
      
      // Get user metadata for this studio
      const userMeta = allUserMeta[tursoUser.id] || {};
      
      // Create enhanced studio name
      const firstName = userMeta.first_name || '';
      const lastName = userMeta.last_name || '';
      let studioName = tursoUser.display_name || tursoUser.username || `Studio ${tursoUser.id}`;
      
      if (firstName && lastName) {
        studioName = `${firstName} ${lastName} Studio`;
      }
      
      // Enhanced description from multiple metadata fields
      const aboutText = userMeta.about || '';
      const shortAbout = userMeta.shortabout || '';
      const description = aboutText || shortAbout || `Professional voiceover studio operated by ${studioName}`;
      
      // Enhanced address and location
      const location = userMeta.location || '';
      const address = userMeta.loc1 || location || '';
      const latitude = userMeta.loc3 ? parseFloat(userMeta.loc3) : null;
      const longitude = userMeta.loc4 ? parseFloat(userMeta.loc4) : null;
      
      // Enhanced contact information
      const phone = userMeta.phone || '';
      const website = userMeta.url || userMeta.homepage1 || userMeta.homepage2 || '';
      
      // Determine studio type based on metadata
      let studioType: 'RECORDING' | 'PODCAST' | 'HOME' | 'PRODUCTION' | 'MOBILE' = 'RECORDING';
      if (userMeta.homestudio || userMeta.homestudio2) {
        studioType = 'HOME';
      } else if (userMeta.category?.toLowerCase().includes('podcast')) {
        studioType = 'PODCAST';
      } else if (userMeta.category?.toLowerCase().includes('mobile')) {
        studioType = 'MOBILE';
      } else if (userMeta.category?.toLowerCase().includes('production')) {
        studioType = 'PRODUCTION';
      }
      
      await prisma.studio.create({
        data: {
          id: `turso_${tursoUser.id}`,
          ownerId: owner.id,
          name: studioName,
          description: description,
          studioType: studioType,
          address: address,
          latitude: latitude,
          longitude: longitude,
          websiteUrl: website || null,
          phone: phone || null,
          isPremium: Boolean(userMeta.featured || userMeta.spotlight),
          isVerified: Boolean(userMeta.verified || userMeta.crb),
          status: 'ACTIVE',
          createdAt: new Date(tursoUser.created_at),
          updatedAt: new Date(tursoUser.updated_at || tursoUser.created_at),
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating studio ${tursoUser.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateStudioServices() {
  console.log('🔄 Migrating studio services...');
  
  const allUserMeta = await tursoDb.getAllUserMeta();
  let servicesAdded = 0;
  
  for (const [userId, userMeta] of Object.entries(allUserMeta)) {
    try {
      const studioId = `turso_${userId}`;
      
      // Check if studio exists
      const studio = await prisma.studio.findUnique({ where: { id: studioId } });
      if (!studio) continue;
      
      const services: string[] = [];
      
      // Map connection types to services
      for (let i = 1; i <= 15; i++) {
        const connection = userMeta[`connection${i}`];
        if (connection) {
          const serviceType = mapConnectionToService(connection);
          if (serviceType && !services.includes(serviceType)) {
            services.push(serviceType);
          }
        }
      }
      
      // Add ISDN if mentioned
      if (userMeta.sc || userMeta.von) {
        if (!services.includes('SOURCE_CONNECT')) {
          services.push('SOURCE_CONNECT');
        }
      }
      
      // Create service records
      for (const service of services) {
        try {
          await prisma.studioService.create({
            data: {
              studioId: studioId,
              service: service as any,
            },
          });
          servicesAdded++;
        } catch (error) {
          // Skip if service already exists for this studio
        }
      }
    } catch (error) {
      console.error(`Error adding services for studio ${userId}:`, error);
    }
  }
  
  console.log(`✅ Added ${servicesAdded} studio services`);
}

async function migrateStudioImages() {
  console.log('🔄 Migrating studio images...');
  
  const client = await tursoDb.connect();
  const galleryResult = await client.execute('SELECT * FROM studio_gallery ORDER BY user_id, display_order');
  const stats = { total: galleryResult.rows.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const galleryItem of galleryResult.rows) {
    try {
      const studioId = `turso_${galleryItem.user_id}`;
      
      // Check if studio exists
      const studio = await prisma.studio.findUnique({ where: { id: studioId } });
      if (!studio) {
        stats.skipped++;
        continue;
      }
      
      // Skip avatar images (they're handled in user migration)
      if (galleryItem.image_type === 'avatar') {
        stats.skipped++;
        continue;
      }
      
      await prisma.studioImage.create({
        data: {
          studioId: studioId,
          imageUrl: galleryItem.cloudinary_url || galleryItem.image_filename,
          altText: `Studio image for ${studio.name}`,
          sortOrder: galleryItem.display_order || 0,
        },
      });
      
      stats.migrated++;
    } catch (error) {
      console.error(`Error migrating image ${galleryItem.id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateUserConnections() {
  console.log('🔄 Migrating user connections...');
  
  const client = await tursoDb.connect();
  const contactsResult = await client.execute('SELECT * FROM shows_contacts WHERE accepted = 1');
  const stats = { total: contactsResult.rows.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const contact of contactsResult.rows) {
    try {
      const user1Id = `turso_${contact.user1}`;
      const user2Id = `turso_${contact.user2}`;
      
      // Check if both users exist
      const [user1, user2] = await Promise.all([
        prisma.user.findUnique({ where: { id: user1Id } }),
        prisma.user.findUnique({ where: { id: user2Id } })
      ]);
      
      if (!user1 || !user2) {
        stats.skipped++;
        continue;
      }
      
      // Create bidirectional connections
      await Promise.all([
        prisma.userConnection.create({
          data: {
            userId: user1Id,
            connectedUserId: user2Id,
            accepted: true,
            createdAt: new Date(),
          },
        }),
        prisma.userConnection.create({
          data: {
            userId: user2Id,
            connectedUserId: user1Id,
            accepted: true,
            createdAt: new Date(),
          },
        })
      ]);
      
      stats.migrated++;
    } catch (error) {
      // Skip if connection already exists
      stats.errors++;
    }
  }
  
  return stats;
}

async function migrateReviewsEnhanced() {
  console.log('🔄 Migrating reviews...');
  
  const tursoReviews = await tursoDb.getReviews();
  const stats = { total: tursoReviews.length, migrated: 0, skipped: 0, errors: 0 };
  
  for (const tursoReview of tursoReviews) {
    try {
      const reviewerId = `turso_${tursoReview.reviewer_id}`;
      const studioId = `turso_${tursoReview.studio_id}`;
      
      // Find the migrated user and studio
      const [reviewer, studio] = await Promise.all([
        prisma.user.findUnique({ where: { id: reviewerId } }),
        prisma.studio.findUnique({ where: { id: studioId }, include: { owner: true } })
      ]);
      
      if (!reviewer || !studio) {
        stats.skipped++;
        continue;
      }
      
      await prisma.review.create({
        data: {
          id: `turso_${tursoReview.id}`,
          reviewerId: reviewer.id,
          studioId: studio.id,
          ownerId: studio.ownerId,
          rating: tursoReview.rating || 5,
          content: tursoReview.content,
          status: 'APPROVED',
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

// Helper functions
function mapUserRole(roleId: number): 'USER' | 'STUDIO_OWNER' | 'ADMIN' {
  switch (roleId) {
    case 1:
      return 'ADMIN';
    case 2:
      return 'STUDIO_OWNER';
    default:
      return 'STUDIO_OWNER'; // Most users in the legacy system are studio owners
  }
}

function mapConnectionToService(connection: string): string | null {
  const conn = connection.toLowerCase();
  if (conn.includes('source connect') || conn.includes('sourceconnect')) {
    return 'SOURCE_CONNECT';
  } else if (conn.includes('cleanfeed')) {
    return 'CLEANFEED';
  } else if (conn.includes('sessionlink') || conn.includes('session link')) {
    return 'SESSION_LINK_PRO';
  } else if (conn.includes('zoom')) {
    return 'ZOOM';
  } else if (conn.includes('skype')) {
    return 'SKYPE';
  } else if (conn.includes('teams')) {
    return 'TEAMS';
  } else if (conn.includes('isdn')) {
    return 'ISDN';
  }
  return null;
}

async function main() {
  console.log('🚀 Starting Enhanced Turso Migration...\n');
  console.log('This will import ALL data from Turso while preserving the current schema.\n');
  
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
    
    // Clear existing data
    await clearExistingData();
    
    // Perform enhanced migrations
    const stats: EnhancedMigrationStats = {
      users: await migrateUsersEnhanced(),
      studios: await migrateStudiosEnhanced(),
      userConnections: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      studioImages: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      reviews: { total: 0, migrated: 0, skipped: 0, errors: 0 },
      metadata: { total: 0, processed: 0, errors: 0 }
    };
    
    // Add studio services
    await migrateStudioServices();
    
    // Migrate additional data
    stats.studioImages = await migrateStudioImages();
    stats.userConnections = await migrateUserConnections();
    stats.reviews = await migrateReviewsEnhanced();
    
    // Print summary
    console.log('\n📊 Enhanced Migration Summary:');
    console.log('===============================');
    
    Object.entries(stats).forEach(([type, stat]) => {
      if (typeof stat === 'object' && 'total' in stat) {
        console.log(`${type.toUpperCase()}:`);
        console.log(`  Total: ${stat.total}`);
        console.log(`  Migrated: ${stat.migrated}`);
        console.log(`  Skipped: ${stat.skipped}`);
        console.log(`  Errors: ${stat.errors}`);
        console.log();
      }
    });
    
    const totalMigrated = Object.values(stats).reduce((sum, stat) => {
      return typeof stat === 'object' && 'migrated' in stat ? sum + stat.migrated : sum;
    }, 0);
    
    const totalErrors = Object.values(stats).reduce((sum, stat) => {
      return typeof stat === 'object' && 'errors' in stat ? sum + stat.errors : sum;
    }, 0);
    
    if (totalErrors === 0) {
      console.log(`✅ Enhanced migration completed successfully! Migrated ${totalMigrated} records.`);
    } else {
      console.log(`⚠️  Enhanced migration completed with ${totalErrors} errors. ${totalMigrated} records migrated.`);
    }
    
    console.log('\n🎉 Your database now contains all the rich legacy data!');
    console.log('🔧 The current codebase will continue to work unchanged.');
    
  } catch (error) {
    console.error('❌ Enhanced migration failed:', error);
    process.exit(1);
  } finally {
    await tursoDb.disconnect();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

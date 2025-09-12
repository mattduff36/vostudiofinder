#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { TursoDatabase } from '../../src/lib/migration/turso-db';

const prisma = new PrismaClient();
const tursoDb = new TursoDatabase();

async function analyzeNeonDatabase() {
  console.log('🔍 Analyzing Neon PostgreSQL Database...\n');
  
  try {
    // Get counts from all tables
    const [
      userCount,
      studioCount,
      reviewCount,
      accountCount,
      sessionCount,
      messageCount,
      subscriptionCount,
      notificationCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.studio.count(),
      prisma.review.count(),
      prisma.account.count(),
      prisma.session.count(),
      prisma.message.count(),
      prisma.subscription.count(),
      prisma.notification.count()
    ]);

    console.log('📊 Neon Database Counts:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Studios: ${studioCount}`);
    console.log(`  Reviews: ${reviewCount}`);
    console.log(`  Accounts: ${accountCount}`);
    console.log(`  Sessions: ${sessionCount}`);
    console.log(`  Messages: ${messageCount}`);
    console.log(`  Subscriptions: ${subscriptionCount}`);
    console.log(`  Notifications: ${notificationCount}`);
    console.log(`  Total Records: ${userCount + studioCount + reviewCount + accountCount + sessionCount + messageCount + subscriptionCount + notificationCount}`);

    // Get sample data
    const sampleUsers = await prisma.user.findMany({ take: 3 });
    const sampleStudios = await prisma.studio.findMany({ take: 3 });
    
    console.log('\n📋 Sample Data:');
    console.log('Users:', sampleUsers.map(u => ({ id: u.id, email: u.email, displayName: u.displayName })));
    console.log('Studios:', sampleStudios.map(s => ({ id: s.id, name: s.name, ownerId: s.ownerId })));

    return {
      userCount,
      studioCount,
      reviewCount,
      accountCount,
      sessionCount,
      messageCount,
      subscriptionCount,
      notificationCount,
      totalRecords: userCount + studioCount + reviewCount + accountCount + sessionCount + messageCount + subscriptionCount + notificationCount
    };
  } catch (error) {
    console.error('Error analyzing Neon database:', error);
    throw error;
  }
}

async function analyzeTursoDatabase() {
  console.log('\n🔍 Analyzing Turso Database...\n');
  
  try {
    // Get all tables
    const allTables = await tursoDb.getAllTables();
    console.log('📋 All Turso Tables:');
    console.log(allTables.join(', '));
    
    // Get validation data
    const validation = await tursoDb.validateDatabase();
    console.log('\n📊 Turso Database Counts:');
    if (validation.counts) {
      Object.entries(validation.counts).forEach(([table, count]) => {
        console.log(`  ${table}: ${count}`);
      });
    }

    // Get detailed counts for all tables
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;
    
    for (const table of allTables) {
      try {
        const client = await tursoDb.connect();
        const result = await client.execute(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = result.rows[0].count as number;
        tableCounts[table] = count;
        totalRecords += count;
      } catch (error) {
        console.warn(`Could not get count for ${table}:`, error);
        tableCounts[table] = 0;
      }
    }

    console.log('\n📈 Complete Turso Table Counts:');
    Object.entries(tableCounts)
      .sort(([,a], [,b]) => b - a) // Sort by count descending
      .forEach(([table, count]) => {
        console.log(`  ${table}: ${count}`);
      });
    
    console.log(`\n  Total Records: ${totalRecords}`);
    console.log(`  Total Tables: ${allTables.length}`);

    return {
      allTables,
      tableCounts,
      totalRecords,
      totalTables: allTables.length
    };
  } catch (error) {
    console.error('Error analyzing Turso database:', error);
    throw error;
  }
}

async function compareSchemas() {
  console.log('\n🔄 Schema Compatibility Analysis...\n');
  
  // Current Prisma schema tables
  const prismaModels = [
    'User', 'Account', 'Session', 'Studio', 'StudioService', 'StudioImage',
    'Review', 'ReviewResponse', 'Message', 'UserConnection', 'Subscription',
    'SavedSearch', 'PendingSubscription', 'Refund', 'Notification', 'ContentReport'
  ];

  // Turso main tables
  const tursoMainTables = [
    'shows_users', 'shows_usermeta', 'shows_comments', 'shows_commentvotes',
    'shows_contacts', 'shows_messages', 'shows_options', 'shows_roles', 'shows_sessions'
  ];

  console.log('🏗️ Current Prisma Models:');
  console.log(prismaModels.join(', '));
  
  console.log('\n🗄️ Turso Main Tables:');
  console.log(tursoMainTables.join(', '));

  console.log('\n⚠️ Compatibility Issues:');
  console.log('1. Prisma uses modern normalized schema with relations');
  console.log('2. Turso uses legacy flat structure with metadata tables');
  console.log('3. Different naming conventions (camelCase vs snake_case)');
  console.log('4. Different data types and constraints');
  console.log('5. Turso has multiple database prefixes (shows_, community_, faq_)');

  return {
    prismaModels,
    tursoMainTables,
    compatible: false,
    requiresTransformation: true
  };
}

async function main() {
  console.log('🚀 Database Analysis and Comparison\n');
  console.log('=====================================\n');
  
  try {
    const neonAnalysis = await analyzeNeonDatabase();
    const tursoAnalysis = await analyzeTursoDatabase();
    await compareSchemas();

    console.log('\n📋 SUMMARY REPORT');
    console.log('==================\n');
    
    console.log('💾 Current Neon Database:');
    console.log(`  - ${neonAnalysis.totalRecords} total records`);
    console.log(`  - 16 Prisma models`);
    console.log(`  - Modern normalized schema`);
    console.log(`  - Compatible with current codebase`);
    
    console.log('\n🗄️ Turso Database:');
    console.log(`  - ${tursoAnalysis.totalRecords} total records`);
    console.log(`  - ${tursoAnalysis.totalTables} total tables`);
    console.log(`  - Legacy flat structure`);
    console.log(`  - Multiple database prefixes`);
    console.log(`  - Requires transformation for compatibility`);

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================\n');
    
    if (neonAnalysis.totalRecords > 0) {
      console.log('⚠️  Current Neon database contains data that would be lost');
      console.log('📦 Consider backing up current data before proceeding');
    }
    
    console.log('🔄 To use Turso data with current codebase:');
    console.log('   1. Keep current Prisma schema (it works with the site)');
    console.log('   2. Use migration scripts to transform Turso data');
    console.log('   3. Map legacy structure to modern schema');
    console.log('   4. Preserve data relationships and integrity');
    
    console.log('\n❌ Direct copy NOT recommended because:');
    console.log('   - Schema incompatibility');
    console.log('   - Different data structures');
    console.log('   - Would break current codebase');
    console.log('   - Requires significant code changes');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await tursoDb.disconnect();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

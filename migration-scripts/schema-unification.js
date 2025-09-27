#!/usr/bin/env node

/**
 * Schema Unification Migration Script
 * 
 * This script updates the existing Prisma schema with admin models
 * and creates initial admin-specific data.
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const db = new PrismaClient();

class SchemaUnificationMigrator {
  constructor() {
    this.stats = {
      faq: { created: 0, errors: 0 },
      contacts: { created: 0, errors: 0 },
      poi: { created: 0, errors: 0 }
    };
  }

  async migrate() {
    console.log('🚀 Starting schema unification migration...');
    
    try {
      // Test database connection
      await this.testConnection();
      
      // Create admin-specific data
      await this.createFaqData();
      await this.createContactData();
      await this.createPoiData();
      
      // Print migration summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
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

  async createFaqData() {
    console.log('❓ Creating FAQ data...');
    
    // Check if FAQ data already exists
    const existingFaqs = await db.faq.count();
    
    if (existingFaqs > 0) {
      console.log(`⚠️  ${existingFaqs} FAQ entries already exist, skipping...`);
      return;
    }

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
        await db.faq.create({
          data: faq
        });

        this.stats.faq.created++;
        console.log(`✅ Created FAQ: ${faq.question}`);

      } catch (error) {
        this.stats.faq.errors++;
        console.error(`❌ Failed to create FAQ: ${error.message}`);
      }
    }
  }

  async createContactData() {
    console.log('📞 Creating contact data...');
    
    // Check if contact data already exists
    const existingContacts = await db.contact.count();
    
    if (existingContacts > 0) {
      console.log(`⚠️  ${existingContacts} contact entries already exist, skipping...`);
      return;
    }

    // Create sample contact data if needed
    console.log('✅ Contact data creation completed (no initial data needed)');
  }

  async createPoiData() {
    console.log('📍 Creating POI data...');
    
    // Check if POI data already exists
    const existingPois = await db.poi.count();
    
    if (existingPois > 0) {
      console.log(`⚠️  ${existingPois} POI entries already exist, skipping...`);
      return;
    }

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
        await db.poi.create({
          data: poi
        });

        this.stats.poi.created++;
        console.log(`✅ Created POI: ${poi.name}`);

      } catch (error) {
        this.stats.poi.errors++;
        console.error(`❌ Failed to create POI: ${error.message}`);
      }
    }
  }

  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    
    Object.entries(this.stats).forEach(([model, stats]) => {
      console.log(`${model}: ${stats.created} created, ${stats.errors} errors`);
    });
    
    const totalCreated = Object.values(this.stats).reduce((sum, stats) => sum + stats.created, 0);
    const totalErrors = Object.values(this.stats).reduce((sum, stats) => sum + stats.errors, 0);
    
    console.log(`\nTotal: ${totalCreated} created, ${totalErrors} errors`);
    
    if (totalErrors === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with errors. Please review the logs.');
    }
  }

  async cleanup() {
    await db.$disconnect();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new SchemaUnificationMigrator();
  migrator.migrate()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default SchemaUnificationMigrator;

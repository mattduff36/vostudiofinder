#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateTwitterData() {
  console.log('🔄 Starting Twitter to X data migration...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'prisma/migrations/migrate_twitter_to_x.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Extract only the UPDATE statement (skip comments)
    const updateStatement = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    
    // Execute the migration
    await prisma.$executeRawUnsafe(updateStatement);
    
    // Verify the migration
    const result = await prisma.user_profiles.count({
      where: {
        x_url: {
          not: null
        }
      }
    });
    
    console.log(`✅ Migration complete! ${result} profiles now have x_url set.`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateTwitterData();


#!/usr/bin/env tsx

import { TursoDatabase } from '../../src/lib/migration/turso-db';

async function main() {
  console.log('🔍 Validating Turso database connection and structure...\n');
  
  const tursoDb = new TursoDatabase();
  
  try {
    const validation = await tursoDb.validateDatabase();
    
    if (!validation.valid) {
      console.error('❌ Turso database validation failed:', validation.error);
      process.exit(1);
    }
    
    console.log('✅ Turso database connection successful');
    console.log('📊 Database structure:');
    console.log('  Tables found:', validation.tables?.join(', '));
    console.log('\n📈 Record counts:');
    
    if (validation.counts) {
      Object.entries(validation.counts).forEach(([table, count]) => {
        console.log(`  ${table}: ${count} records`);
      });
    }
    
    // Get all tables to see what's available
    console.log('\n🔍 Exploring database structure...');
    const allTables = await tursoDb.getAllTables();
    console.log('All available tables:', allTables.join(', '));
    
    // Show sample data from key tables
    for (const table of ['users', 'contacts', 'comments']) {
      if (allTables.includes(table)) {
        console.log(`\n📋 Sample data from ${table}:`);
        try {
          const schema = await tursoDb.getTableSchema(table);
          console.log('  Columns:', schema.map((col: any) => `${col.name} (${col.type})`).join(', '));
          
          const sampleData = await tursoDb.getSampleData(table, 3);
          if (sampleData.length > 0) {
            console.log('  Sample records:', sampleData.length);
            console.log('  First record keys:', Object.keys(sampleData[0]).join(', '));
          } else {
            console.log('  No data found in table');
          }
        } catch (error) {
          console.log(`  Error reading ${table}:`, error);
        }
      }
    }
    
    console.log('\n🎯 Ready for migration!');
    console.log('Run: npm run migrate:turso');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await tursoDb.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

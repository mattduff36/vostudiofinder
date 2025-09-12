#!/usr/bin/env tsx

import { TursoDatabase } from '../../src/lib/migration/turso-db';

async function main() {
  console.log('🔍 Exploring Turso database structure...\n');
  
  const tursoDb = new TursoDatabase();
  
  try {
    // Get all tables to see what's available
    console.log('📋 Getting all available tables...');
    const allTables = await tursoDb.getAllTables();
    console.log('Available tables:', allTables.join(', '));
    
    if (allTables.length === 0) {
      console.log('❌ No tables found in the database');
      return;
    }
    
    // Show schema and sample data for each table
    for (const table of allTables) {
      console.log(`\n📊 Table: ${table}`);
      console.log('=' + '='.repeat(table.length + 8));
      
      try {
        const schema = await tursoDb.getTableSchema(table);
        console.log('Columns:');
        schema.forEach((col: any) => {
          console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });
        
        const sampleData = await tursoDb.getSampleData(table, 3);
        console.log(`\nSample data (${sampleData.length} records):`);
        if (sampleData.length > 0) {
          // Show first record with all fields
          console.log('First record:');
          Object.entries(sampleData[0]).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
          
          if (sampleData.length > 1) {
            console.log(`\n... and ${sampleData.length - 1} more records`);
          }
        } else {
          console.log('  (No data found)');
        }
      } catch (error) {
        console.log(`  Error reading table ${table}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Exploration failed:', error);
    process.exit(1);
  } finally {
    await tursoDb.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

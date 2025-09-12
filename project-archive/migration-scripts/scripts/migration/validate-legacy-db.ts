#!/usr/bin/env tsx

import { LegacyDatabase } from '../../src/lib/migration/legacy-db';

async function main() {
  console.log('🔍 Validating legacy database connection and structure...\n');
  
  const legacyDb = new LegacyDatabase();
  
  try {
    const validation = await legacyDb.validateDatabase();
    
    if (!validation.valid) {
      console.error('❌ Legacy database validation failed:', validation.error);
      process.exit(1);
    }
    
    console.log('✅ Legacy database connection successful');
    console.log('📊 Database structure:');
    console.log('  Tables found:', validation.tables?.join(', '));
    console.log('\n📈 Record counts:');
    
    if (validation.counts) {
      Object.entries(validation.counts).forEach(([table, count]) => {
        console.log(`  ${table}: ${count} records`);
      });
    }
    
    console.log('\n🎯 Ready for migration!');
    console.log('Run: npm run migrate:legacy');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await legacyDb.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

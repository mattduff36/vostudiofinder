/**
 * Database Schema Comparison Script
 * Compares dev and production database schemas to identify differences
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load dev database URL from .env.local
const devEnv = config({ path: resolve(process.cwd(), '.env.local') });
const devUrl = devEnv.parsed?.DATABASE_URL;

// Load production database URL from .env.production
const prodEnv = config({ path: resolve(process.cwd(), '.env.production') });
const prodUrl = prodEnv.parsed?.DATABASE_URL;

if (!devUrl || !prodUrl) {
  console.error('❌ Missing database URLs');
  console.error('DATABASE_URL:', devUrl ? '✓' : '✗');
  console.error('PRODUCTION_DATABASE_URL:', prodUrl ? '✓' : '✗');
  process.exit(1);
}

const devDb = new PrismaClient({ datasources: { db: { url: devUrl } } });
const prodDb = new PrismaClient({ datasources: { db: { url: prodUrl } } });

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getTableStructure(db: PrismaClient, label: string): Promise<Map<string, TableInfo[]>> {
  try {
    const result = await db.$queryRaw<TableInfo[]>`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name, ordinal_position;
    `;

    const tableMap = new Map<string, TableInfo[]>();
    for (const row of result) {
      if (!tableMap.has(row.table_name)) {
        tableMap.set(row.table_name, []);
      }
      tableMap.get(row.table_name)!.push(row);
    }

    console.log(`\n✅ ${label}: Found ${tableMap.size} tables, ${result.length} columns total`);
    return tableMap;
  } catch (error) {
    console.error(`❌ Error fetching ${label} structure:`, error);
    throw error;
  }
}

async function compareDatabases() {
  console.log('\n🔍 Starting Database Schema Comparison...\n');
  console.log('📊 Configuration:');
  console.log(`   Dev DB: ${devUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);
  console.log(`   Prod DB: ${prodUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);

  try {
    const devTables = await getTableStructure(devDb, 'DEV Database');
    const prodTables = await getTableStructure(prodDb, 'PRODUCTION Database');

    console.log('\n─────────────────────────────────────────\n');

    // Find tables only in dev
    const devOnlyTables = Array.from(devTables.keys()).filter(t => !prodTables.has(t));
    if (devOnlyTables.length > 0) {
      console.log('⚠️  Tables ONLY in DEV:');
      devOnlyTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }

    // Find tables only in prod
    const prodOnlyTables = Array.from(prodTables.keys()).filter(t => !devTables.has(t));
    if (prodOnlyTables.length > 0) {
      console.log('⚠️  Tables ONLY in PRODUCTION:');
      prodOnlyTables.forEach(t => console.log(`   - ${t}`));
      console.log('');
    }

    // Compare common tables
    const commonTables = Array.from(devTables.keys()).filter(t => prodTables.has(t));
    console.log(`📋 Comparing ${commonTables.length} common tables...\n`);

    let differencesFound = false;

    for (const tableName of commonTables.sort()) {
      const devCols = devTables.get(tableName)!;
      const prodCols = prodTables.get(tableName)!;

      const devColMap = new Map(devCols.map(c => [c.column_name, c]));
      const prodColMap = new Map(prodCols.map(c => [c.column_name, c]));

      // Find columns only in dev
      const devOnlyCols = devCols.filter(c => !prodColMap.has(c.column_name));
      // Find columns only in prod
      const prodOnlyCols = prodCols.filter(c => !devColMap.has(c.column_name));

      // Find columns with different types
      const typeDiffs: string[] = [];
      for (const devCol of devCols) {
        const prodCol = prodColMap.get(devCol.column_name);
        if (prodCol && devCol.data_type !== prodCol.data_type) {
          typeDiffs.push(`${devCol.column_name}: ${devCol.data_type} (dev) vs ${prodCol.data_type} (prod)`);
        }
      }

      // Report differences for this table
      if (devOnlyCols.length > 0 || prodOnlyCols.length > 0 || typeDiffs.length > 0) {
        differencesFound = true;
        console.log(`⚠️  Table: ${tableName}`);
        
        if (devOnlyCols.length > 0) {
          console.log('   Columns ONLY in DEV:');
          devOnlyCols.forEach(c => console.log(`      - ${c.column_name} (${c.data_type})`));
        }
        
        if (prodOnlyCols.length > 0) {
          console.log('   Columns ONLY in PROD:');
          prodOnlyCols.forEach(c => console.log(`      - ${c.column_name} (${c.data_type})`));
        }
        
        if (typeDiffs.length > 0) {
          console.log('   Type Differences:');
          typeDiffs.forEach(d => console.log(`      - ${d}`));
        }
        
        console.log('');
      }
    }

    console.log('─────────────────────────────────────────\n');

    if (!differencesFound && devOnlyTables.length === 0 && prodOnlyTables.length === 0) {
      console.log('✅ SUCCESS! Both databases have identical schemas.');
      console.log('   No differences detected.\n');
    } else {
      console.log('⚠️  DIFFERENCES FOUND between dev and production databases.');
      console.log('   Review the differences above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Comparison failed:', error);
    process.exit(1);
  } finally {
    await devDb.$disconnect();
    await prodDb.$disconnect();
  }
}

compareDatabases();


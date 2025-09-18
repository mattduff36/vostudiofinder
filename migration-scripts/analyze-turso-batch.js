// Batch script to analyze Turso database structure
import { tursoClient, fetchAllTurso } from './utils/turso-client.js';
import { migrationLogger } from './utils/logger.js';

async function analyzeTursoDatabase() {
  console.log('🔍 BATCH: Analyzing Turso Database Structure...');
  migrationLogger.startPhase('Turso Database Analysis');
  
  try {
    // Step 1: Get all table names
    console.log('\n1/5 Getting all table names...');
    const tables = await fetchAllTurso("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    console.log(`   ✅ Found ${tables.length} tables`);
    migrationLogger.info(`Found ${tables.length} tables in Turso database`, 'ANALYSIS', { 
      tableNames: tables.map(t => t.name) 
    });
    
    // Step 2: Focus on user-related tables
    console.log('\n2/5 Identifying user-related tables...');
    const userTables = tables.filter(t => 
      t.name.toLowerCase().includes('user') || 
      t.name.toLowerCase().includes('profile') ||
      t.name.toLowerCase().includes('member') ||
      ['users', 'profile', 'shows_users', 'community_users'].includes(t.name)
    );
    console.log(`   ✅ Found ${userTables.length} user-related tables:`, userTables.map(t => t.name));
    
    // Step 3: Analyze main user tables
    console.log('\n3/5 Analyzing main user tables...');
    const mainTables = ['users', 'profile', 'shows_users', 'community_users'];
    const tableAnalysis = {};
    
    for (const tableName of mainTables) {
      try {
        console.log(`   Analyzing ${tableName}...`);
        
        // Get record count
        const countResult = await fetchAllTurso(`SELECT COUNT(*) as count FROM ${tableName};`);
        const recordCount = countResult[0].count;
        
        // Get table schema
        const schema = await fetchAllTurso(`PRAGMA table_info(${tableName});`);
        
        // Get sample data if records exist
        let sampleData = [];
        if (recordCount > 0) {
          sampleData = await fetchAllTurso(`SELECT * FROM ${tableName} LIMIT 3;`);
        }
        
        tableAnalysis[tableName] = {
          recordCount,
          schema: schema.map(col => ({
            name: col.name,
            type: col.type,
            notNull: col.notnull === 1,
            primaryKey: col.pk === 1
          })),
          sampleData
        };
        
        console.log(`     ✅ ${tableName}: ${recordCount} records, ${schema.length} columns`);
        
      } catch (error) {
        console.log(`     ❌ ${tableName}: ${error.message}`);
        tableAnalysis[tableName] = { error: error.message };
      }
    }
    
    // Step 4: Analyze other important tables
    console.log('\n4/5 Analyzing other important tables...');
    const otherTables = ['studio_gallery', 'messages', 'shows_contacts'];
    
    for (const tableName of otherTables) {
      try {
        const countResult = await fetchAllTurso(`SELECT COUNT(*) as count FROM ${tableName};`);
        const recordCount = countResult[0].count;
        
        tableAnalysis[tableName] = { recordCount };
        console.log(`   ✅ ${tableName}: ${recordCount} records`);
        
      } catch (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
        tableAnalysis[tableName] = { error: error.message };
      }
    }
    
    // Step 5: Generate analysis report
    console.log('\n5/5 Generating analysis report...');
    
    const report = {
      totalTables: tables.length,
      userRelatedTables: userTables.length,
      tableAnalysis,
      recommendations: []
    };
    
    // Add recommendations based on analysis
    if (tableAnalysis.users && tableAnalysis.users.recordCount > 0) {
      report.recommendations.push(`Primary user table: 'users' with ${tableAnalysis.users.recordCount} records`);
    }
    
    if (tableAnalysis.profile && tableAnalysis.profile.recordCount > 0) {
      report.recommendations.push(`Profile data: 'profile' with ${tableAnalysis.profile.recordCount} records`);
    }
    
    if (tableAnalysis.studio_gallery && tableAnalysis.studio_gallery.recordCount > 0) {
      report.recommendations.push(`Studio images: 'studio_gallery' with ${tableAnalysis.studio_gallery.recordCount} records`);
    }
    
    migrationLogger.info('Turso database analysis completed', 'ANALYSIS', report);
    
    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log(`   Total tables: ${report.totalTables}`);
    console.log(`   User-related tables: ${report.userRelatedTables}`);
    console.log('   Key findings:');
    report.recommendations.forEach(rec => console.log(`     • ${rec}`));
    
    migrationLogger.completePhase('Turso Database Analysis', report);
    console.log('\n✅ BATCH COMPLETED: Turso database analysis finished!');
    
    return report;
    
  } catch (error) {
    migrationLogger.error('Turso database analysis failed', 'ANALYSIS', { error: error.message });
    console.error('\n❌ BATCH FAILED:', error.message);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeTursoDatabase().catch(console.error);
}

export { analyzeTursoDatabase };

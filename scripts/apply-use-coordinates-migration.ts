import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔄 Starting use_coordinates_for_map migration...\n');

  const migrationPath = path.join(process.cwd(), 'prisma/migrations/20250120_add_use_coordinates_for_map/migration.sql');
  
  console.log('📄 Reading migration file...');
  console.log(`   Path: ${migrationPath}\n`);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  // Split by semicolon, but keep statements that don't end with semicolon
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .concat(
      // Also check for statements without semicolon
      sql.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes(';'))
    )
    .filter((s, i, arr) => arr.indexOf(s) === i); // Remove duplicates

  console.log(`📝 Found ${statements.length} SQL statement(s) to execute\n`);

  try {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 60)}...`);
      
      await prisma.$executeRawUnsafe(statement);
      
      console.log(`✅ Statement ${i + 1} completed\n`);
    }

    console.log('🔍 Verifying migration...\n');
    
    // Check if the column exists by trying to query it
    const result = await prisma.$queryRawUnsafe<Array<{ use_coordinates_for_map: boolean | null }>>(
      'SELECT use_coordinates_for_map FROM user_profiles LIMIT 1'
    );
    
    console.log('✅ Migration successful! Column use_coordinates_for_map added to user_profiles table.');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42703') {
      console.error('   This might mean the column already exists or there was an error.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();


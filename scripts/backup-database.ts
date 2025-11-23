import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const execAsync = promisify(exec);

async function backupDatabase() {
  console.log('💾 Creating PostgreSQL database backup...\n');
  
  try {
    // Get database connection details from environment
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    // Parse database URL
    // Format: postgresql://user:password@host:port/database?params
    const dbUrlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
    
    if (!dbUrlMatch) {
      throw new Error('Could not parse DATABASE_URL');
    }
    
    const [, user, password, hostPort, database] = dbUrlMatch;
    const [host, port = '5432'] = hostPort.split(':');
    
    console.log(`📊 Database: ${database}`);
    console.log(`🖥️  Host: ${host}:${port}`);
    console.log(`👤 User: ${user}\n`);
    
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupFile = path.join(backupDir, `database_backup_${timestamp}.sql`);
    
    console.log('🔄 Running pg_dump...\n');
    
    // Set password environment variable for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: password,
    };
    
    // Run pg_dump
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${backupFile}"`;
    
    await execAsync(command, { env });
    
    // Check if backup was created
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file was not created');
    }
    
    const backupSize = fs.statSync(backupFile).size;
    const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);
    
    console.log('=' .repeat(60));
    console.log('✅ DATABASE BACKUP COMPLETE');
    console.log('=' .repeat(60));
    console.log(`📁 Backup file: ${backupFile}`);
    console.log(`📦 Backup size: ${backupSizeMB} MB`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));
    console.log('\n💡 To restore this backup, run:');
    console.log(`   psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${backupFile}"`);
    console.log('\n');
    
    return backupFile;
    
  } catch (error: any) {
    console.error('\n❌ Backup failed:', error.message);
    
    if (error.message.includes('pg_dump')) {
      console.error('\n⚠️  PostgreSQL pg_dump command not found.');
      console.error('   Please ensure PostgreSQL client tools are installed.');
      console.error('   Download from: https://www.postgresql.org/download/');
    }
    
    throw error;
  }
}

backupDatabase();


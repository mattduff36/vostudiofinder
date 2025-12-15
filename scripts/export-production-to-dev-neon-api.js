#!/usr/bin/env node
/**
 * Alternative export method using Neon API
 * This doesn't require pg_dump/pg_restore to be installed
 * 
 * Usage: node scripts/export-production-to-dev-neon-api.js
 */

console.log('=== Neon Database Copy (Alternative Method) ===\n');

console.log('⚠️  Note: This script provides instructions for using Neon Console');
console.log('   For automated export, you need PostgreSQL client tools.\n');

console.log('📋 Manual Steps:\n');
console.log('1. Install PostgreSQL client tools:');
console.log('   Download from: https://www.postgresql.org/download/windows/');
console.log('   Or use Chocolatey: choco install postgresql\n');

console.log('2. After installation, run:');
console.log('   ./scripts/export-production-to-dev.sh\n');

console.log('OR use Neon Console (no install required):\n');
console.log('1. Go to: https://console.neon.tech');
console.log('2. Select your PRODUCTION project');
console.log('3. Click "Backups" → "Create backup"');
console.log('4. Download the backup file');
console.log('5. Go to your DEV project');
console.log('6. Click "Restore" → Upload backup file\n');

console.log('📄 Your database URLs:');
console.log('   Production: Check .env.production');
console.log('   Development: Check .env.local\n');

console.log('❓ Need help? See: docs/INSTALL_POSTGRESQL_WINDOWS.md');

process.exit(0);


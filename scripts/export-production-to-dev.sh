#!/bin/bash
# ============================================
# Export Production Data to Development Database
# ============================================
# This script safely exports production data and imports it to dev database
# Usage: ./scripts/export-production-to-dev.sh
# ============================================

set -e  # Exit on error

echo "=== Production to Dev Database Export/Import ==="
echo ""

# Load environment variables
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Extract DATABASE_URL from env files
PRODUCTION_DB_URL=$(grep "^DATABASE_URL=" .env.production | cut -d '=' -f2-)
DEV_DB_URL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2-)

if [ -z "$PRODUCTION_DB_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env.production"
    exit 1
fi

if [ -z "$DEV_DB_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env.local"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/production_backup_${TIMESTAMP}.dump"

echo "📦 Step 1: Exporting production database..."
echo "   This is a READ-ONLY operation - production is not affected"
echo ""

pg_dump "$PRODUCTION_DB_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Production database exported successfully"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $(du -h $BACKUP_FILE | cut -f1)"
    echo ""
else
    echo "❌ Error: Failed to export production database"
    exit 1
fi

echo "📥 Step 2: Importing to development database..."
echo "   This will REPLACE all data in dev database"
echo ""

# Confirm before proceeding
read -p "Continue with import? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Import cancelled"
    exit 1
fi

pg_restore \
  --dbname="$DEV_DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Data imported to dev database successfully"
    echo ""
else
    echo "❌ Error: Failed to import to dev database"
    exit 1
fi

echo "🔍 Step 3: Verifying data..."
echo ""

# Count records in dev database
psql "$DEV_DB_URL" << 'EOF'
\echo '=== Record Counts in Dev Database ==='
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'studios', COUNT(*) FROM studios;

\echo ''
\echo 'Expected counts (from production):'
\echo 'users: 687'
\echo 'user_profiles: 686'
\echo 'studios: 651'
EOF

echo ""
echo "✅ Production data successfully copied to development database!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the record counts above"
echo "   2. Run: psql \"\$DATABASE_URL\" -f prisma/migrations/consolidation/01_cleanup_legacy_data.sql"
echo "   3. Run: psql \"\$DATABASE_URL\" -f prisma/migrations/consolidation/02_merge_profiles_studios.sql"
echo ""
echo "💾 Backup file saved: $BACKUP_FILE"
echo "   Keep this file until migration is complete!"


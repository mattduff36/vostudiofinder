#!/bin/bash

# ============================================
# Sync Production Database to Dev Database
# ============================================
# WARNING: This REPLACES your dev database with production data!
# Run this weekly or before major development work.
# ============================================

set -e  # Exit on error

echo "🔄 Production → Dev Database Sync"
echo "=================================="
echo ""

# Safety check
read -p "⚠️  This will REPLACE dev database with production data. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Sync cancelled"
    exit 1
fi

# Load environment variables
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    exit 1
fi

if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    exit 1
fi

PROD_URL=$(grep DATABASE_URL .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'")
DEV_URL=$(grep DATABASE_URL .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$PROD_URL" ]; then
    echo "❌ Error: Production DATABASE_URL not found in .env.production"
    exit 1
fi

if [ -z "$DEV_URL" ]; then
    echo "❌ Error: Dev DATABASE_URL not found in .env.local"
    exit 1
fi

echo "📊 Source: Production database"
echo "📊 Target: Dev database"
echo ""

# Create backup timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/dev_before_sync_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p backups

echo "💾 Step 1: Backing up current dev database..."
pg_dump "$DEV_URL" > "$BACKUP_FILE"
echo "✅ Dev database backed up to: $BACKUP_FILE"
echo ""

echo "📥 Step 2: Dumping production database..."
TEMP_DUMP="backups/prod_dump_${TIMESTAMP}.sql"
pg_dump "$PROD_URL" > "$TEMP_DUMP"
echo "✅ Production data dumped"
echo ""

echo "🔄 Step 3: Restoring to dev database..."
# Drop existing schema and restore
psql "$DEV_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DEV_URL" < "$TEMP_DUMP"
echo "✅ Production data restored to dev"
echo ""

echo "🧹 Step 4: Cleaning up temp files..."
rm "$TEMP_DUMP"
echo "✅ Cleanup complete"
echo ""

echo "✅ Sync complete!"
echo ""
echo "📊 Database Record Counts:"
psql "$DEV_URL" -c "SELECT 'studio_profiles' as table_name, COUNT(*) as count FROM studio_profiles
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;"

echo ""
echo "⚠️  IMPORTANT: Your dev database now contains PRODUCTION data"
echo "   - Be careful with any destructive operations"
echo "   - Backup saved to: $BACKUP_FILE"


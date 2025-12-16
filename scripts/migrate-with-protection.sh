#!/bin/bash

# ============================================
# Protected Database Migration Script
# ============================================
# This script prevents accidental production migrations
# ============================================

set -e

echo "🛡️  Protected Database Migration"
echo "================================"
echo ""

# Determine which environment we're targeting
if [ -z "$1" ]; then
    echo "Usage: ./scripts/migrate-with-protection.sh [dev|production]"
    echo ""
    echo "Examples:"
    echo "  ./scripts/migrate-with-protection.sh dev        # Migrate dev database"
    echo "  ./scripts/migrate-with-protection.sh production # Migrate production (requires confirmation)"
    exit 1
fi

ENVIRONMENT=$1

case $ENVIRONMENT in
    dev)
        echo "🔧 Target: DEV database"
        if [ ! -f .env.local ]; then
            echo "❌ Error: .env.local not found"
            exit 1
        fi
        DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        ;;
    
    production)
        echo "⚠️  Target: PRODUCTION database"
        echo ""
        echo "╔════════════════════════════════════════════════╗"
        echo "║   ⚠️  PRODUCTION DATABASE MIGRATION WARNING   ║"
        echo "╚════════════════════════════════════════════════╝"
        echo ""
        echo "This will modify the LIVE production database!"
        echo ""
        echo "✅ Checklist before proceeding:"
        echo "   [ ] Have you tested this migration on dev?"
        echo "   [ ] Have you backed up production?"
        echo "   [ ] Have you reviewed all SQL changes?"
        echo "   [ ] Is this during a maintenance window?"
        echo "   [ ] Do you have a rollback plan?"
        echo ""
        
        # Require explicit confirmation
        read -p "Type 'MIGRATE PRODUCTION' to continue: " confirm
        if [ "$confirm" != "MIGRATE PRODUCTION" ]; then
            echo "❌ Migration cancelled"
            exit 1
        fi
        
        # Second confirmation
        read -p "Are you absolutely sure? (yes/no): " confirm2
        if [ "$confirm2" != "yes" ]; then
            echo "❌ Migration cancelled"
            exit 1
        fi
        
        if [ ! -f .env.production ]; then
            echo "❌ Error: .env.production not found"
            exit 1
        fi
        DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        ;;
    
    *)
        echo "❌ Error: Invalid environment '$ENVIRONMENT'"
        echo "   Must be 'dev' or 'production'"
        exit 1
        ;;
esac

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in environment file"
    exit 1
fi

echo ""
echo "🔍 Database verification..."

# Verify we can connect
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to database"
    exit 1
fi

# Show current database info
echo "📊 Current database state:"
psql "$DATABASE_URL" -c "SELECT 
    COUNT(*) FILTER (WHERE relname = 'studio_profiles') as studio_profiles_exists,
    COUNT(*) FILTER (WHERE relname = 'users') as users_exists
FROM pg_class 
WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace;"

echo ""
echo "🚀 Running migration..."
echo ""

# Run Prisma migration
export DATABASE_URL
npx prisma migrate deploy

echo ""
echo "✅ Migration complete!"
echo ""
echo "📊 Post-migration verification:"
psql "$DATABASE_URL" -c "SELECT 'studio_profiles' as table_name, COUNT(*) as count FROM studio_profiles
UNION ALL SELECT 'users', COUNT(*) FROM users;"


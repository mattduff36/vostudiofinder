#!/bin/bash

# Deploy Email System Database Migration to Production
# Migration: 20260128005950_add_email_system_and_rate_limiting_tables

set -e  # Exit on any error

echo "🚀 Database Migration Deployment Script"
echo "========================================"
echo ""
echo "Migration: add_email_system_and_rate_limiting_tables"
echo "Target: Production Database"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production file not found"
  echo "   Please ensure .env.production exists in the project root"
  exit 1
fi

# Backup current .env
echo "📦 Backing up current .env file..."
if [ -f .env ]; then
  cp .env .env.backup
  echo "   ✅ Backup created: .env.backup"
fi

# Switch to production environment
echo ""
echo "🔄 Switching to production environment..."
cp .env.production .env
echo "   ✅ Using production database"

# Check current migration status
echo ""
echo "📊 Checking migration status..."
npx prisma migrate status

# Prompt for confirmation
echo ""
read -p "⚠️  Apply migration to PRODUCTION database? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo ""
  echo "❌ Migration cancelled"
  
  # Restore original .env
  if [ -f .env.backup ]; then
    mv .env.backup .env
    echo "   ✅ Restored original .env"
  fi
  
  exit 0
fi

# Apply migrations
echo ""
echo "⚡ Applying migrations to production..."
npx prisma migrate deploy

# Verify migration status
echo ""
echo "✅ Verifying migration status..."
npx prisma migrate status

# Restore original .env
echo ""
echo "🔙 Restoring development environment..."
if [ -f .env.backup ]; then
  mv .env.backup .env
  echo "   ✅ Restored original .env"
fi

echo ""
echo "🎉 Migration deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify tables exist in production database"
echo "2. Test email campaign functionality"
echo "3. Monitor rate limiting logs"
echo "4. Deploy application code to production"
echo ""
echo "For verification queries, see: docs/DATABASE_MIGRATION_DEPLOYMENT.md"

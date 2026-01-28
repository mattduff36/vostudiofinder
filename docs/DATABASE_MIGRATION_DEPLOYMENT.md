# Database Migration Deployment Guide

## Migration: Add Email System and Rate Limiting Tables

**Migration File**: `20260128005950_add_email_system_and_rate_limiting_tables`  
**Date**: January 28, 2026  
**Status**: ✅ Applied to Dev | ⏳ Pending Production

---

## What This Migration Does

This migration adds six new tables to support the email campaign system and rate limiting:

1. **`email_templates`** - Store custom email templates created by admins
2. **`email_template_versions`** - Version history for email templates
3. **`email_campaigns`** - Email campaign definitions and tracking
4. **`email_deliveries`** - Individual email delivery records
5. **`email_preferences`** - User marketing opt-in/out preferences and unsubscribe tokens
6. **`rate_limit_events`** - Track rate limiting for bot protection

---

## ✅ Dev Database (Already Applied)

The dev database (`.env.local`) has been updated:

```bash
# Dev database: ep-odd-band-ab5sw2ff-pooler.eu-west-2.aws.neon.tech
✅ Migration created
✅ Schema pushed with `npx prisma db push`
✅ Migration marked as applied with `npx prisma migrate resolve`
✅ Status: Database schema is up to date
```

---

## ⏳ Production Database (Ready to Deploy)

### Prerequisites

1. **Backup**: Ensure you have a recent backup of the production database
2. **Environment**: Have access to `.env.production` file
3. **Downtime**: This migration adds new tables only - no downtime required

### Deployment Steps

#### Option 1: Using Prisma Migrate (Recommended)

```bash
# Step 1: Switch to production environment
# Copy .env.production to .env temporarily
cp .env.production .env

# Step 2: Check migration status
npx prisma migrate status

# Step 3: Apply pending migrations
npx prisma migrate deploy

# Step 4: Verify migration was applied
npx prisma migrate status

# Step 5: Restore dev environment
cp .env.local .env
```

#### Option 2: Manual SQL Execution (Alternative)

If you prefer to run the SQL manually through your database management tool:

1. Connect to production database
2. Open `prisma/migrations/20260128005950_add_email_system_and_rate_limiting_tables/migration.sql`
3. Execute the SQL script
4. Mark migration as applied: `npx prisma migrate resolve --applied 20260128005950_add_email_system_and_rate_limiting_tables`

### Post-Deployment Verification

After applying the migration, verify the tables exist:

```sql
-- Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'email_templates',
  'email_template_versions', 
  'email_campaigns',
  'email_deliveries',
  'email_preferences',
  'rate_limit_events'
);

-- Expected: 6 rows returned
```

---

## Migration Safety

### Risk Level: **LOW** ✅

- **Operation**: `CREATE TABLE` only
- **Breaking changes**: None
- **Downtime required**: No
- **Rollback complexity**: Easy (just drop the tables if needed)

### Rollback Script (If Needed)

```sql
-- WARNING: This will delete all data in these tables
DROP TABLE IF EXISTS "email_deliveries" CASCADE;
DROP TABLE IF EXISTS "email_campaigns" CASCADE;
DROP TABLE IF EXISTS "email_template_versions" CASCADE;
DROP TABLE IF EXISTS "email_templates" CASCADE;
DROP TABLE IF EXISTS "email_preferences" CASCADE;
DROP TABLE IF EXISTS "rate_limit_events" CASCADE;
```

---

## Related Files

- Migration SQL: `prisma/migrations/20260128005950_add_email_system_and_rate_limiting_tables/migration.sql`
- Schema: `prisma/schema.prisma` (lines 452-968)
- Code using new tables:
  - `src/app/api/admin/emails/**/*.ts`
  - `src/lib/email/send-templated.ts`
  - `src/lib/rate-limiting.ts`

---

## Timeline

- **Dev Applied**: January 28, 2026 00:59:50 UTC
- **Production Deploy**: Pending
- **Estimated Duration**: < 5 seconds (only creating tables)

---

## Questions?

If you encounter any issues:

1. Check Prisma migration status: `npx prisma migrate status`
2. Check database connection: `npx prisma db pull`
3. Review migration SQL: `cat prisma/migrations/20260128005950_add_email_system_and_rate_limiting_tables/migration.sql`

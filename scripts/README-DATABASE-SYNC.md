# Database Synchronization Scripts

## 🎯 Overview

These scripts help you safely synchronize data between development and production databases.

## ⚠️ Critical Safety Rules

1. **NEVER** run production write operations without explicit confirmation
2. **ALWAYS** backup production before any write operation
3. **READ ONLY** from production by default
4. Test on dev first, always

## 📦 Available Scripts

### 1. Quick Sync: Production → Dev
```bash
npm run db:sync-prod-to-dev
```

**Purpose:** Copy missing users, studios, and data from production to dev  
**Safety:** ✅ Safe - Only reads production, only writes to dev  
**Use When:** Dev is behind production (normal scenario)

**What it does:**
- Analyzes both databases
- Finds users/studios in production but not in dev
- Copies missing records to dev
- Skips existing records
- Never touches production

### 2. Database Sync Tool (Interactive)
```bash
npm run db:sync-tool
```

**Purpose:** Interactive menu with multiple sync options  
**Safety:** ⚠️ Varies by option chosen

**Available Options:**
1. ✅ Add missing data PRODUCTION → DEV (safe) - **FULLY FUNCTIONAL**
2. ⚠️ Add missing data DEV → PRODUCTION (caution) - **NOT IMPLEMENTED**
3. ⚠️ Mirror PRODUCTION → DEV (may lose dev data) - **GUIDANCE ONLY**
4. 🚨 Mirror DEV → PRODUCTION (dangerous) - **INTENTIONALLY BLOCKED**
5. ✅ Compare database schemas (safe) - **FULLY FUNCTIONAL**
6. ✅ Export production backup (safe) - **FULLY FUNCTIONAL**

## 🚀 Quick Start

### Scenario 1: Dev is behind production (most common)

**Option A: Quick Sync (standalone script)**
```bash
npm run db:sync-prod-to-dev
```

**Option B: Interactive Tool**
```bash
npm run db:sync-tool
# Select option 1 (Add missing data PRODUCTION → DEV)
```

### Scenario 2: Compare database schemas

```bash
npm run db:sync-tool
# Select option 5 (Compare database schemas)
```

### Scenario 3: Create production backup

```bash
npm run db:sync-tool
# Select option 6 (Export production backup)
```

## 📋 Current Status (as of last check)

**Production:**
- Total Users: 688
- Users with studios: 642
- Users without studios: 46

**Dev:**
- Total Users: 641
- Users with studios: 641
- Users without studios: 0

**Missing in Dev:** 47 users (46 without studios + ~1 with studio)

## 🔧 Technical Details

### Database Connections

- **Dev:** `.env.local` → `DATABASE_URL`
- **Production:** `.env.production` → `DATABASE_URL`

Both scripts automatically load the correct environment files.

### Data Copied

When syncing, these records are copied:
- ✅ Users
- ✅ Studio profiles
- ✅ Studio types
- ✅ Studio images
- ✅ Studio services
- ✅ Reviews
- ✅ FAQ entries (if applicable)
- ✅ Waitlist entries (if applicable)

### Conflict Resolution

**sync-production-to-dev.ts:**
- Checks both user ID and email
- Skips if either already exists in dev
- Preserves all existing dev data

## 🛡️ Safety Features

### Production Protection
- Production is **read-only** by default in all safe operations
- Option 2 (DEV → PRODUCTION) is not implemented for safety
- Option 4 (Mirror DEV → PRODUCTION) is permanently blocked
- Multiple confirmation prompts for any destructive operations
- Dangerous operations require typing specific phrases

### Dev Protection
- Sync operations skip existing records (no overwrites)
- Reviews with missing users are automatically skipped
- All operations use database transactions (all-or-nothing)
- Clear warnings before any data loss

## ⚡ Features

### Option 1: Production → Dev Sync
- ✅ Copies missing users and studios from prod to dev
- ✅ Preserves all existing dev data
- ✅ Automatically skips reviews with missing users
- ✅ Uses transactions for data integrity
- ✅ Shows detailed progress and summary

### Option 5: Schema Comparison
- ✅ Lists all tables in both databases
- ✅ Identifies tables only in production
- ✅ Identifies tables only in dev
- ✅ Shows count of matching tables
- ✅ Provides commands for detailed comparison

### Option 6: Production Backup
- ✅ Creates timestamped SQL backup file
- ✅ Safe read-only operation
- ✅ Shows restore command
- ✅ Filename format: `backup-production-YYYY-MM-DD_HHMMSS.sql`

## ⚡ Manual Commands (Advanced)

### Export Production Backup (manual)
```bash
pg_dump $PROD_DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Compare Schemas (detailed)
```bash
pg_dump --schema-only $PROD_DATABASE_URL > prod-schema.sql
pg_dump --schema-only $DEV_DATABASE_URL > dev-schema.sql
diff prod-schema.sql dev-schema.sql
```

### Restore Backup to Dev
```bash
psql $DEV_DATABASE_URL < backup-production-2026-01-04_120000.sql
```

## 🐛 Troubleshooting

### Error: "Missing database URLs"
- Check that `.env.local` and `.env.production` exist
- Verify `DATABASE_URL` is set in both files

### Error: "Unique constraint violation"
- User already exists (by ID or email)
- Script will skip automatically

### Stuck prompts
- Press Ctrl+C to exit safely
- Database connections are properly closed

## 📞 Support

If you encounter issues:
1. Check database connection strings
2. Verify Prisma schema is up to date
3. Run `npx prisma generate` if needed
4. Check the terminal output for specific errors

## ⚠️ Remember

**GOLDEN RULE:** When in doubt, don't write to production. Test on dev first!


# 🛡️ Database Migration Safety Guide

## **CRITICAL RULES**

### ❌ **NEVER DO THIS:**
- ❌ Run `prisma migrate deploy` without specifying environment
- ❌ Run `prisma db push` on production
- ❌ Modify `.env.production` during development
- ❌ Run migrations without testing on dev first

### ✅ **ALWAYS DO THIS:**
- ✅ Test migrations on dev database first
- ✅ Use the protected migration script
- ✅ Back up production before any changes
- ✅ Review migration SQL files before applying

---

## **HOW TO SYNC DEV DATABASE**

### **Weekly Sync (Recommended)**

```bash
# Run this weekly or before starting new features
./scripts/sync-prod-to-dev.sh
```

This will:
1. ✅ Back up your current dev database
2. ✅ Copy production data to dev
3. ✅ Verify the sync completed successfully

### **Manual Sync (Alternative)**

```bash
# Backup dev database first
pg_dump "$(grep DATABASE_URL .env.local | cut -d'=' -f2-)" > backups/dev_backup_$(date +%Y%m%d).sql

# Dump production
pg_dump "$(grep DATABASE_URL .env.production | cut -d'=' -f2-)" > backups/prod_dump.sql

# Restore to dev
psql "$(grep DATABASE_URL .env.local | cut -d'=' -f2-)" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$(grep DATABASE_URL .env.local | cut -d'=' -f2-)" < backups/prod_dump.sql
```

---

## **HOW TO RUN MIGRATIONS SAFELY**

### **Step 1: Create Migration on Dev**

```bash
# Make sure you're using dev database
echo "Using: $(grep DATABASE_URL .env.local)"

# Create migration
npx prisma migrate dev --name your_migration_name
```

### **Step 2: Test Migration on Dev**

```bash
# Apply migration to dev
./scripts/migrate-with-protection.sh dev

# Test the changes
npm run dev
# Browse site, test features, check data integrity
```

### **Step 3: Review Migration Files**

```bash
# Review the SQL that will run on production
cat prisma/migrations/TIMESTAMP_your_migration_name/migration.sql
```

### **Step 4: Apply to Production (ONLY IF TESTED)**

```bash
# ⚠️ PRODUCTION MIGRATION - Requires explicit confirmation
./scripts/migrate-with-protection.sh production
```

You will be prompted:
```
⚠️  PRODUCTION DATABASE MIGRATION WARNING

Type 'MIGRATE PRODUCTION' to continue: _
```

---

## **ENVIRONMENT FILE VERIFICATION**

### **Before ANY Migration, Verify:**

```bash
# Check dev database
echo "DEV:  $(grep DATABASE_URL .env.local | cut -d'=' -f2- | grep -o 'ep-[^/]*')"

# Check production database  
echo "PROD: $(grep DATABASE_URL .env.production | cut -d'=' -f2- | grep -o 'ep-[^/]*')"
```

These should show **DIFFERENT** database endpoints:
- Dev: `ep-odd-band-...` (or whatever your dev DB is)
- Prod: `ep-plain-glitter-...` (or whatever your prod DB is)

⚠️ **If they're the same, STOP and fix your env files!**

---

## **MIGRATION WORKFLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE MIGRATION                                         │
│    npx prisma migrate dev --name feature_name               │
│    ↓                                                         │
│    Creates: prisma/migrations/TIMESTAMP_feature_name/       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TEST ON DEV DATABASE                                     │
│    ./scripts/migrate-with-protection.sh dev                 │
│    ↓                                                         │
│    Applies migration to .env.local database                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. VERIFY & TEST                                            │
│    - npm run dev                                            │
│    - Browse site                                            │
│    - Test affected features                                 │
│    - Check data integrity                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. REVIEW MIGRATION SQL                                     │
│    cat prisma/migrations/*/migration.sql                    │
│    - Check for DROP statements                              │
│    - Verify data transformations                            │
│    - Ensure rollback plan exists                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKUP PRODUCTION                                        │
│    pg_dump "$(grep DATABASE_URL .env.production...)" > ... │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. APPLY TO PRODUCTION (WITH PROTECTION)                    │
│    ./scripts/migrate-with-protection.sh production          │
│    ↓                                                         │
│    Requires typing "MIGRATE PRODUCTION" to confirm          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. VERIFY PRODUCTION                                        │
│    - Check site is working                                  │
│    - Verify data integrity                                  │
│    - Monitor for errors                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## **EMERGENCY ROLLBACK**

If something goes wrong:

```bash
# 1. Restore from backup
psql "$(grep DATABASE_URL .env.production | cut -d'=' -f2-)" < backups/prod_backup_TIMESTAMP.sql

# 2. Or use Neon's point-in-time recovery
# Go to Neon dashboard → Your database → Restore
```

---

## **NEON DATABASE PROTECTION**

### **Enable Branch Protection (Recommended)**

1. Go to Neon Dashboard: https://console.neon.tech/
2. Select your **production** database
3. Go to **Settings** → **Protected Branches**
4. Enable: **Require pull request reviews before applying changes**

This adds an extra layer of protection for production.

---

## **VERCEL DEPLOYMENT PROTECTION**

In `vercel.json`, add:

```json
{
  "build": {
    "env": {
      "DATABASE_URL": "@production-database-url"
    }
  },
  "env": {
    "DATABASE_URL": "@production-database-url"
  }
}
```

Store production DATABASE_URL as a Vercel environment variable, not in `.env.production`.

---

## **CHECKLIST: Before Production Migration**

- [ ] Migration tested on dev database
- [ ] Code changes tested locally
- [ ] Production database backed up
- [ ] Migration SQL reviewed
- [ ] Rollback plan prepared
- [ ] Maintenance window scheduled (if needed)
- [ ] Team notified
- [ ] Monitoring ready

---

## **QUICK REFERENCE**

```bash
# Sync dev with production
./scripts/sync-prod-to-dev.sh

# Create migration
npx prisma migrate dev --name feature_name

# Test on dev
./scripts/migrate-with-protection.sh dev

# Apply to production (with safety checks)
./scripts/migrate-with-protection.sh production

# Check which database you're using
echo "Current: $(grep DATABASE_URL .env.local)"
```


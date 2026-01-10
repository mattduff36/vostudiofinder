# 🛡️ Database Safety Setup Complete

## **PROTECTION MECHANISMS INSTALLED**

### ✅ **1. Environment Separation**
- `.env.local` → DEV database
- `.env.production` → PRODUCTION database
- `.env` → DELETED (no longer needed)

### ✅ **2. Safety Scripts Created**

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/show-db-env.sh` | Show which DB you're using | `npm run db:check` |
| `scripts/sync-prod-to-dev.sh` | Copy production data to dev | `npm run db:sync` |
| `scripts/migrate-with-protection.sh` | Protected migrations | `npm run db:migrate:dev` or `npm run db:migrate:prod` |

### ✅ **3. NPM Commands Added**

```bash
# Check which database environment is active
npm run db:check

# Sync production data to dev (weekly recommended)
npm run db:sync

# Run migration on DEV database (safe)
npm run db:migrate:dev

# Run migration on PRODUCTION (requires confirmation)
npm run db:migrate:prod
```

---

## **HOW IT PREVENTS ACCIDENTS**

### **Problem: Accidental Production Migration**
**Before:** Running `prisma migrate` could hit production if DATABASE_URL was wrong.

**Now:** 
1. ✅ Must explicitly choose `dev` or `production`
2. ✅ Production requires typing "MIGRATE PRODUCTION" to confirm
3. ✅ Second confirmation required
4. ✅ Visual warnings displayed
5. ✅ Cannot proceed without explicit approval

### **Problem: Dev Database Gets Stale**
**Before:** Dev database could be weeks old with missing recent production data.

**Now:**
1. ✅ Run `npm run db:sync` weekly
2. ✅ Automatically backs up dev before sync
3. ✅ Shows record counts after sync
4. ✅ Verifies sync completed successfully

---

## **DAILY WORKFLOW**

### **Starting Development**

```bash
# 1. Check which database you're using
npm run db:check

# Output should show:
# 🔧 DEV Database (.env.local): ep-odd-band-...
# 🚀 PRODUCTION Database (.env.production): ep-plain-glitter-...
# ✅ Dev and Production databases are properly separated

# 2. Start dev server (uses .env.local → DEV database)
npm run dev
```

### **Creating a New Feature with Database Changes**

```bash
# 1. Sync dev with production data (optional, if needed)
npm run db:sync

# 2. Create migration
npx prisma migrate dev --name add_new_feature

# 3. Test migration on dev
npm run db:migrate:dev

# 4. Test the changes
npm run dev
# Browse site, test features

# 5. Review migration SQL
cat prisma/migrations/*/migration.sql

# 6. Commit code changes
git add .
git commit -m "feat: add new feature with migration"
git push

# 7. When ready for production (after testing):
npm run db:migrate:prod
# ⚠️ This will prompt for confirmation
```

---

## **WEEKLY MAINTENANCE**

```bash
# Every Monday (or your preferred schedule):
npm run db:sync

# This ensures your dev database has recent production data
```

---

## **EMERGENCY: What If I Need to Migrate Production NOW?**

```bash
# 1. Verify you're targeting the right database
npm run db:check

# 2. Backup production (CRITICAL!)
pg_dump "$(grep DATABASE_URL .env.production | cut -d'=' -f2-)" > backups/emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Run protected migration
npm run db:migrate:prod

# You'll see:
# ⚠️  PRODUCTION DATABASE MIGRATION WARNING
# Type 'MIGRATE PRODUCTION' to continue: _

# 4. Type exactly: MIGRATE PRODUCTION

# 5. Confirm again when prompted

# 6. Monitor for errors
```

---

## **NEON DASHBOARD PROTECTION (Recommended)**

1. Go to https://console.neon.tech/
2. Select your PRODUCTION database
3. Go to Settings → Protected Branches
4. Enable protection

This adds an extra layer of safety.

---

## **VERIFICATION COMMANDS**

```bash
# Check dev database record count
psql "$(grep DATABASE_URL .env.local | cut -d'=' -f2-)" -c "SELECT COUNT(*) FROM studio_profiles;"

# Check production database record count
psql "$(grep DATABASE_URL .env.production | cut -d'=' -f2-)" -c "SELECT COUNT(*) FROM studio_profiles;"

# Show database IDs
npm run db:check
```

---

## **ROLLBACK PROCEDURE**

If a production migration goes wrong:

```bash
# 1. Restore from backup
psql "$(grep DATABASE_URL .env.production | cut -d'=' -f2-)" < backups/emergency_backup_TIMESTAMP.sql

# 2. Revert code changes
git revert HEAD

# 3. Redeploy
git push
```

---

## **FILES ADDED**

```
scripts/
├── show-db-env.sh              ← Show database environment
├── sync-prod-to-dev.sh         ← Sync production to dev
├── migrate-with-protection.sh  ← Protected migrations
└── MIGRATION_SAFETY_GUIDE.md   ← Detailed guide

docs/
└── DATABASE_SAFETY_SETUP.md    ← This file

package.json                     ← Added new npm scripts
```

---

## **IMPORTANT REMINDERS**

1. ✅ Always run `npm run db:check` before migrations
2. ✅ Test on dev first, then production
3. ✅ Keep dev and production URLs in separate files
4. ✅ Never commit .env.local or .env.production
5. ✅ Backup production before any changes
6. ✅ Sync dev database weekly

---

## **QUICK REFERENCE**

```bash
# Daily
npm run db:check          # Verify environment
npm run dev               # Start dev server

# Weekly
npm run db:sync           # Sync prod → dev

# When creating features
npm run db:migrate:dev    # Test migration on dev
npm run db:migrate:prod   # Apply to production (careful!)

# Emergency
pg_dump "..." > backup.sql  # Backup
psql "..." < backup.sql     # Restore
```

---

**🎉 Your database is now protected from accidental migrations!**


# Database Consolidation Migration Scripts

This directory contains SQL scripts for migrating from the three-table architecture (`users` → `user_profiles` → `studios`) to a two-table architecture (`users` → `studio_profiles`).

## Scripts

### 01_cleanup_legacy_data.sql
**Purpose**: Remove problematic records before migration
- Deletes 1 user without a user_profile
- Deletes 36 users with profiles but no studios (legacy spam accounts)
- Verifies all remaining users have both profiles and studios (1:1:1 relationship)

**Safety**: Read-only analysis first, then destructive operations

### 02_merge_profiles_studios.sql
**Purpose**: Main migration - creates studio_profiles and migrates data
1. Creates new `studio_profiles` table with all fields from both old tables
2. Migrates data using INNER JOIN (merges both tables)
3. Updates foreign keys in related tables (studio_images, studio_services, etc.)
4. Creates performance indices
5. Runs verification queries

**Important**: Does NOT drop old tables - that happens after code is updated

### 99_rollback.sql
**Purpose**: Emergency rollback script
- Recreates `studios` and `user_profiles` from `studio_profiles`
- Restores all constraints and foreign keys
- **Use ONLY if critical issues discovered**

## Execution Order

### Development (Testing):
```bash
# 1. Export production data to dev database first
pg_dump "PRODUCTION_URL" --format=custom --file=prod_backup.dump
pg_restore --dbname="DEV_URL" --clean prod_backup.dump

# 2. Run cleanup
psql "$DEV_DATABASE_URL" -f 01_cleanup_legacy_data.sql

# 3. Run migration
psql "$DEV_DATABASE_URL" -f 02_merge_profiles_studios.sql

# 4. Verify results
psql "$DEV_DATABASE_URL" -c "SELECT COUNT(*) FROM studio_profiles;"
```

### Production (After thorough testing):
```bash
# Same commands but with PRODUCTION_DATABASE_URL
# DO NOT run until all code is updated and tested on dev!
```

## Expected Results

**Before cleanup:**
- 687 users
- 686 user_profiles  
- 651 studios

**After cleanup:**
- 650 users
- 650 user_profiles
- 650 studios

**After migration:**
- 650 users
- 650 studio_profiles
- Old tables (user_profiles, studios) still exist but unused

## Rollback Procedure

If issues discovered within 24-48 hours:

```bash
# Option 1: Restore from backup (fastest)
pg_restore --dbname="$DATABASE_URL" --clean prod_backup.dump

# Option 2: Run rollback script
psql "$DATABASE_URL" -f 99_rollback.sql
```

## Safety Notes

- ✅ All scripts have verification queries
- ✅ Foreign keys updated automatically
- ✅ Indices created for performance
- ✅ Old tables preserved until final cleanup
- ✅ Rollback script available
- ⚠️  Always test on dev database first!
- ⚠️  Take backup before production run!

## Timeline

1. Test on dev database: Phase 5 of migration plan
2. Update application code: Phase 6 of migration plan  
3. Run on production: Phase 8 (during maintenance window)
4. Drop old tables: Phase 10 (after 7 days of stable operation)


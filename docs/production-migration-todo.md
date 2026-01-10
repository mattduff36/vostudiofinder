# Production Migration - Ready to Execute Checklist

**Status**: Development migration complete ✅  
**Date Prepared**: December 16, 2025  
**Feature Branch**: `feature/database-consolidation`

---

## 🎯 Quick Start Prompt for Cursor

Copy and paste this into Cursor when you're ready to complete the production migration:

```
I'm ready to complete the production database migration. 

The dev database migration is complete and tested. I've been testing the updated 
database on a live preview build with my client and we're both satisfied everything 
is working correctly.

Please follow the Production Migration plan in 
c:\Users\mattd\.cursor\plans\zero-downtime_db_migration_e607505c.plan.md starting 
at "Phase 8: Production Migration (5-10 Minute Maintenance Window)".

Before you begin:
1. Confirm all prerequisites are met
2. Walk me through the timeline
3. Wait for my explicit approval before starting the migration
4. Do NOT run "git push" unless I say exactly "push to GitHub"
```

---

## 📋 Pre-Migration Checklist

Before starting the production migration, verify:

### Development Environment
- [x] Dev database migration completed successfully
- [x] All code changes committed to `feature/database-consolidation` branch
- [x] Test build passed with no errors
- [x] All TypeScript errors resolved
- [ ] Manual testing completed and approved by client
- [ ] No critical bugs reported

### Production Readiness
- [ ] Low-traffic time slot scheduled (e.g., 2-4 AM)
- [ ] Team/users notified of maintenance window
- [ ] Maintenance page ready (if applicable)
- [ ] Recent production database backup exists
- [ ] Rollback plan reviewed and understood
- [ ] All environment variables verified in `.env.production`

### Code Review
- [ ] `feature/database-consolidation` branch reviewed
- [ ] All changes documented
- [ ] Breaking changes identified and accounted for
- [ ] No debug code or console.logs left in

---

## 🚀 Migration Timeline (8-10 minutes)

```
T+0:00  Enable maintenance mode (optional)
T+0:30  Final production backup
T+2:00  Run cleanup script (removes 37 legacy records)
T+3:00  Run migration script (creates studio_profiles table)
T+5:00  Run verification queries
T+6:00  Merge to main and deploy (Vercel auto-deploys)
T+7:00  Test critical paths
T+8:00  Disable maintenance mode
T+10:00 Monitor error logs
```

---

## 📝 Key Files Reference

### Database Scripts
- `prisma/migrations/consolidation/01_cleanup_legacy_data.sql` - Removes orphaned records
- `prisma/migrations/consolidation/02_merge_profiles_studios.sql` - Main migration
- `prisma/migrations/consolidation/99_rollback.sql` - Emergency rollback

### Documentation
- Full plan: `c:\Users\mattd\.cursor\plans\zero-downtime_db_migration_e607505c.plan.md`
- Dev migration summary: `MIGRATION_COMPLETE_SUMMARY.md`
- Code changes summary: `WORK_COMPLETE_SUMMARY.md`
- Consolidated schema report: `docs/DATABASE_SCHEMA_REPORT_CONSOLIDATED.html`

### Environment Files
- `.env.production` - Contains production DATABASE_URL
- `.env.local` - Contains dev DATABASE_URL (for reference)

---

## 🔍 What Was Changed

### Database Schema
- **Removed**: `user_profiles` and `studios` tables (will drop after 7 days)
- **Added**: `studio_profiles` table (combines both)
- **Relationship**: `users` → `studio_profiles` (1:1)

### Code Updates
- **18 API route files** updated to use `studio_profiles`
- **8 component files** updated for new schema
- **All TypeScript types** updated
- **Foreign key references** updated in 5 related tables

### Key Changes
- `user.studios[0]` → `user.studio_profiles`
- `studio.owner_id` → `studio_profiles.user_id`
- `studio.address` → `studio.full_address` (legacy field removed)
- Profile and studio data now in single query

---

## ⚠️ Critical Notes

### DO NOT SKIP
1. **Backup First**: Always create a fresh backup before migration
2. **Verify Counts**: After migration, verify record counts match
3. **Test Before Going Live**: Run smoke tests before disabling maintenance
4. **Monitor Closely**: Watch logs for first 24 hours

### Expected Results
- **Before cleanup**: 687 users, 686 profiles, 651 studios
- **After cleanup**: 650 users, 650 profiles, 650 studios
- **After migration**: 650 studio_profiles created

### If Something Goes Wrong
1. **STOP immediately**
2. Run verification queries to assess damage
3. Restore from pre-migration backup (5-7 minutes)
4. Or run rollback script if data needs to be preserved
5. Notify the team and investigate

---

## 📊 Post-Migration Monitoring

### First 24 Hours - Monitor Continuously
- [ ] Application error logs (check for Prisma errors)
- [ ] Database query performance
- [ ] Page load times (should be same or better)
- [ ] User-reported issues (support tickets)
- [ ] API response times

### First Week - Daily Checks
- [ ] Day 1: Intensive monitoring
- [ ] Day 2: Check error rates
- [ ] Day 3: Review user feedback
- [ ] Day 4: Query performance analysis
- [ ] Day 5: Data integrity spot checks
- [ ] Day 6: Compare metrics to baseline
- [ ] Day 7: Final approval to drop old tables

### Success Metrics
- Query performance: ≥30% faster (or at least not slower)
- Page load time: ≤ previous baseline
- Error rate: ≤ previous baseline
- User satisfaction: No new critical complaints
- Data integrity: 100% (zero corruption)

---

## 🎬 After Migration Complete (Day 7+)

### Final Cleanup
Only after 7 days of stable operation with zero issues:

1. **Drop old tables**:
   ```sql
   DROP TABLE IF EXISTS studios CASCADE;
   DROP TABLE IF EXISTS user_profiles CASCADE;
   ```

2. **Archive migration scripts**:
   ```bash
   mkdir -p docs/migrations/2025-12-consolidation
   mv prisma/migrations/consolidation/* docs/migrations/2025-12-consolidation/
   ```

3. **Update documentation** to reflect new schema

4. **Delete dev database** (optional, to save costs)

---

## 🔄 Rollback Plan

### Option 1: Restore from Backup (Fastest - 5-7 minutes)
```bash
# 1. Enable maintenance mode
# 2. Restore from backup
pg_restore --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  production_backup_pre_migration_TIMESTAMP.dump

# 3. Revert code deployment
git revert HEAD
git push origin main

# 4. Disable maintenance mode
```

### Option 2: Run Rollback Script
```bash
# If you need to preserve changes made after migration
psql "$DATABASE_URL" -f prisma/migrations/consolidation/99_rollback.sql

# Then revert code
git revert HEAD
git push origin main
```

---

## 📞 Quick Reference Commands

### Database Connection
```bash
# Connect to production database
psql "$DATABASE_URL"

# Run SQL file
psql "$DATABASE_URL" -f script.sql

# Quick count check
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM studio_profiles;"
```

### Git Commands
```bash
# Merge to main
git checkout main
git merge feature/database-consolidation
git push origin main  # Only after saying "push to GitHub"

# Revert if needed
git revert HEAD
git push origin main
```

### Verification Query
```sql
-- Check migration success
SELECT 
  'studio_profiles' as table_name, 
  COUNT(*) as count 
FROM studio_profiles
UNION ALL
SELECT 'old studios', COUNT(*) FROM studios
UNION ALL  
SELECT 'old profiles', COUNT(*) FROM user_profiles;

-- Should show:
-- studio_profiles: 650
-- old studios: 650
-- old profiles: 650
```

---

## ✅ Sign-Off

When you're satisfied with the testing and ready to proceed:

1. ✅ Client has approved the dev environment
2. ✅ All checklist items above are complete
3. ✅ Maintenance window is scheduled
4. ✅ Backup strategy is confirmed
5. ✅ Team is notified

**Then use the Quick Start Prompt above to begin the production migration.**

---

## 📚 Additional Resources

- **Full Migration Plan**: `c:\Users\mattd\.cursor\plans\zero-downtime_db_migration_e607505c.plan.md`
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Neon Console**: https://console.neon.tech/

---

**Good luck! 🚀**



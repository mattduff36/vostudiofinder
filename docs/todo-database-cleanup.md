# Database Cleanup Task - Unused Tables

**Status:** Deferred for Future  
**Created:** January 4, 2026  
**Priority:** Low (No Impact on Performance)

---

## Overview

After removing unused features from the codebase (Network, Reviews, Messages, Notifications, Saved Searches, Moderation), the corresponding database tables still exist but are no longer used by the application.

---

## Unused Database Tables (8 total)

The following tables are **safe to delete** when ready:

1. `contacts` - Network/connections feature (deprecated)
2. `content_reports` - Moderation reports (deprecated)
3. `messages` - Messaging system (deprecated)
4. `review_responses` - Review replies (deprecated)
5. `reviews` - Studio reviews (deprecated)
6. `saved_searches` - Saved search filters (deprecated)
7. `user_connections` - Network connections (deprecated)
8. `refunds` - Refunds management (deprecated)

---

## Unused Enums (5 total)

These enums are only referenced by the unused tables above:

1. `ContentType` - Used by content_reports
2. `NotificationType` - Used by notifications
3. `ReportReason` - Used by content_reports
4. `ReportStatus` - Used by content_reports
5. `ReviewStatus` - Used by reviews

---

## Why Keep Them for Now?

- ✅ No performance impact (tables are small/empty)
- ✅ Preserves data in case features are needed later
- ✅ No risk during current development phase
- ✅ Can restore features without rebuilding data

---

## When to Clean Up

Consider removing these tables when:

1. ✅ **100% certain** features won't be restored
2. ✅ **Sufficient time has passed** (6-12 months) since deletion
3. ✅ **Backup of data exists** if needed for records/compliance
4. ✅ **Ready to commit to permanent deletion**

---

## How to Clean Up (When Ready)

### Step 1: Create Backup (Critical!)

```bash
# Export data from unused tables (if needed for records)
npx prisma db execute --stdin < backup-script.sql
```

### Step 2: Remove from Prisma Schema

Remove these models from `prisma/schema.prisma`:
- `contacts`
- `content_reports`
- `messages`
- `notifications`
- `review_responses`
- `reviews`
- `saved_searches`
- `user_connections`

Remove these enums:
- `ContentType`
- `NotificationType`
- `ReportReason`
- `ReportStatus`
- `ReviewStatus`

### Step 3: Create Migration

```bash
# After removing from schema, create migration
npx prisma migrate dev --name remove_unused_tables
```

### Step 4: Test on Dev Database

```bash
# Apply to dev first
export $(cat .env.local | grep DATABASE_URL | xargs)
npx prisma migrate deploy
```

### Step 5: Apply to Production (After Testing)

```bash
# Apply to production
export $(cat .env.production | grep DATABASE_URL | xargs)
npx prisma migrate deploy
```

---

## Estimated Time to Complete

- **Planning & Backup:** 30 minutes
- **Schema Changes:** 15 minutes
- **Migration Creation:** 5 minutes
- **Dev Testing:** 15 minutes
- **Production Deployment:** 15 minutes

**Total:** ~1.5 hours

---

## Related Files to Update

When cleaning up, also check these files for any remaining references:

- [x] `src/app/api/*` - Already cleaned
- [x] `src/components/*` - Already cleaned
- [ ] `prisma/schema.prisma` - **TO DO**
- [ ] Database tables - **TO DO**

---

## Notes

- Code references were already removed in commit: `Remove unused features: Network, Reviews, Messages, Notifications, Saved Searches, Moderation, and Refunds` (January 4, 2026)
- Migration file location: `prisma/migrations/YYYYMMDD_remove_unused_tables/`
- Remember to announce downtime if tables have foreign key constraints

---

## Checklist (When Ready to Execute)

- [ ] Create full database backup
- [ ] Export data from unused tables (if needed)
- [ ] Remove models and enums from Prisma schema
- [ ] Generate migration file
- [ ] Test on dev database (.env.local)
- [ ] Verify dev application still works
- [ ] Apply to production database (.env.production)
- [ ] Verify production application still works
- [ ] Monitor for any errors post-deployment
- [ ] Document completion in changelog


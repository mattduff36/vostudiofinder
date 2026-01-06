# Migration: Username Reservation & Payment Tracking

**Date:** 2026-01-06  
**Type:** Schema Addition  
**Risk Level:** Low (backward compatible)

## Overview

This migration adds fields to support the Username Reservation & Payment Capture System as outlined in `docs/PRD-username-reservation-system.md`.

## Changes

### New Enum: `UserStatus`
- `PENDING`: User created, awaiting payment
- `ACTIVE`: User completed payment, full access
- `EXPIRED`: Username reservation expired

### New Columns on `users` table:
1. **`status`** (`UserStatus`, NOT NULL, DEFAULT 'PENDING')
   - Tracks account status throughout signup/payment flow
   
2. **`reservation_expires_at`** (`TIMESTAMP`, NULL)
   - When username reservation expires (typically +7 days from signup)
   
3. **`payment_attempted_at`** (`TIMESTAMP`, NULL)
   - First payment attempt timestamp (success or failure)
   
4. **`payment_retry_count`** (`INTEGER`, NOT NULL, DEFAULT 0)
   - Counter for failed payment attempts

5. **`day2_reminder_sent_at`** (`TIMESTAMP`, NULL)
   - Timestamp when Day 2 reminder email was sent (prevents duplicate emails)

6. **`day5_reminder_sent_at`** (`TIMESTAMP`, NULL)
   - Timestamp when Day 5 urgency email was sent (prevents duplicate emails)

### New Indexes:
- `users_status_idx` on `status` column
- `users_reservation_expires_at_idx` on `reservation_expires_at` column

## Data Migration

**All existing users** are automatically updated to `status = 'ACTIVE'` because:
- They already completed signup and payment
- They have active accounts with full access

## How to Apply

### Development Database (`.env.local`):

```bash
# Connect to your dev database
psql $DATABASE_URL_DEV

# Run the migration
\i prisma/migrations/20260106_add_username_reservation_fields/migration.sql

# Verify
SELECT status, COUNT(*) FROM users GROUP BY status;
# Expected: All users should show as 'ACTIVE'
```

### Production Database (`.env.production`):

⚠️ **DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL**

When ready:
1. Backup production database first
2. Test migration on staging environment
3. Apply during low-traffic window
4. Verify all existing users are `ACTIVE`

```bash
# Backup first!
pg_dump $DATABASE_URL_PROD > backup_before_username_reservation_$(date +%Y%m%d_%H%M%S).sql

# Connect to production
psql $DATABASE_URL_PROD

# Run migration
\i prisma/migrations/20260106_add_username_reservation_fields/migration.sql

# Verify
SELECT status, COUNT(*) FROM users GROUP BY status;
```

## Rollback

If you need to rollback this migration:

```bash
psql $DATABASE_URL

\i prisma/migrations/20260106_add_username_reservation_fields/rollback.sql
```

⚠️ **WARNING:** Rollback will delete all username reservation data permanently!

## Testing

After applying migration:

```sql
-- Check schema
\d users

-- Verify all existing users are ACTIVE
SELECT status, COUNT(*) as count 
FROM users 
GROUP BY status;

-- Check indexes exist
\di users_status_idx
\di users_reservation_expires_at_idx

-- Test creating a PENDING user (what new signup will do)
INSERT INTO users (
  id, email, username, display_name, 
  status, reservation_expires_at, 
  created_at, updated_at
) VALUES (
  'test_pending_user',
  'test@example.com',
  'testuser',
  'Test User',
  'PENDING',
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);

-- Verify it was created
SELECT id, email, username, status, reservation_expires_at 
FROM users 
WHERE email = 'test@example.com';

-- Clean up test user
DELETE FROM users WHERE email = 'test@example.com';
```

## Impact

- **Downtime:** None (migration is additive only)
- **Existing users:** All marked as `ACTIVE` automatically
- **New signups:** Will create `PENDING` users starting when Phase 2 code is deployed
- **Performance:** Minimal impact, two new indexes added for query optimization

## Next Steps

After migration is successful:
1. ✅ Deploy Phase 2 code (signup API changes)
2. ✅ Deploy Phase 3 code (webhook handler updates)
3. ✅ Test new signup flow creates PENDING users
4. ✅ Test payment success transitions PENDING → ACTIVE

## Compatibility

- ✅ Backward compatible with existing code
- ✅ Existing queries work unchanged
- ✅ New fields are optional or have defaults
- ✅ Can be applied independently of code deploy


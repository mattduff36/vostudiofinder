# Show Email Default Migration Fix

**Date**: January 23, 2026  
**Status**: ✅ Fixed

## Summary

Fixed a critical schema-database mismatch where the Prisma schema changed `show_email` default from `false` to `true`, but:
1. No Prisma migration was created to update the database default
2. Profile creation code didn't explicitly set the field

This caused new profiles to be created with `show_email: false` (old database default) despite the schema declaring `@default(true)`.

---

## The Bug

### Root Cause
When the Prisma schema was updated to change:
```prisma
show_email Boolean @default(false)
```
to:
```prisma
show_email Boolean @default(true)
```

**Two critical steps were missed:**

1. **No Prisma migration created**: The database still had `DEFAULT false`, so Prisma's schema change had no effect
2. **No explicit field set in code**: Profile creation relied on database defaults, not the Prisma schema default

### Impact
- **New studio profiles** created after the schema change would have `show_email: false` 
- This contradicted the intent of the schema change
- Users wouldn't receive messages by default, defeating the purpose of the change

### Why This Happened
The previous fix (from the earlier conversation) moved the SQL migration out of the Prisma migrations folder to avoid conflicts with the manual execution script. However, this meant the database schema was never actually updated through Prisma's migration system.

---

## The Fix

### 1. Created Proper Prisma Migration

**File**: `prisma/migrations/20260123235424_enable_messages_default_true/migration.sql`

```sql
-- AlterTable
-- Change default value of show_email from false to true
-- Also update existing profiles to enable messages

-- Update all existing profiles to enable messages
UPDATE studio_profiles 
SET show_email = true 
WHERE show_email = false;

-- Change default for new profiles
ALTER TABLE studio_profiles 
ALTER COLUMN show_email SET DEFAULT true;
```

**Why This Matters:**
- Proper Prisma migration that will be tracked in `_prisma_migrations` table
- Will run automatically on `prisma migrate deploy`
- Updates existing profiles AND changes the default for new ones

### 2. Added Explicit `show_email: true` in Profile Creation Code

Updated **4 locations** where studio profiles are created:

#### Location 1: `src/app/api/user/profile/route.ts` (GET - auto-create)
**Lines 177-189**
```typescript
studioProfile = await db.studio_profiles.create({
  data: {
    id: newStudioId,
    user_id: user.id,
    name: '',
    city: '',
    is_profile_visible: false,
    show_email: true, // Enable messages by default (matching schema default)
    created_at: now,
    updated_at: now,
  },
  // ...
});
```

#### Location 2: `src/app/api/user/profile/route.ts` (PUT - manual create)
**Lines 650-662**
```typescript
await db.studio_profiles.create({
  data: {
    id: randomBytes(12).toString('base64url'),
    user_id: userId,
    name: updates.name || 'My Studio',
    city: updates.city || '',
    is_profile_visible: false,
    show_email: true, // Enable messages by default (matching schema default)
    ...profileUpdates,
    updated_at: new Date(),
  },
});
```

#### Location 3: `src/app/api/studio/create/route.ts`
**Lines 50-66**
```typescript
const newStudio = await tx.studio_profiles.create({
  data: {
    id: randomBytes(12).toString('base64url'),
    user_id: session.user.id,
    name: validatedData.name,
    description: validatedData.description,
    // ... other fields
    is_profile_visible: false,
    show_email: true, // Enable messages by default (matching schema default)
    status: 'ACTIVE',
    updated_at: new Date(),
  },
});
```

#### Location 4: `src/app/api/admin/create-studio\route.ts`
**Lines 150-166**
```typescript
await db.studio_profiles.create({
  data: {
    id: studioProfileId,
    user_id: user.id,
    name: studio_name,
    // ... other fields
    show_email: true, // Enable messages by default (matching schema default)
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    ...connectionData,
  },
});
```

**Why This Matters:**
- Defense in depth: even if migration hasn't run yet, code explicitly sets the value
- Makes intent clear to future developers
- Prevents reliance on database defaults which can vary

---

## Defense in Depth Strategy

This fix uses a **layered approach**:

1. **Schema Level**: Prisma schema declares `@default(true)`
2. **Database Level**: Migration changes database default to `true`
3. **Application Level**: Code explicitly sets `show_email: true`

All three layers now agree, preventing any mismatches.

---

## Testing Checklist

### Pre-Deployment
- [ ] Verify migration file exists: `prisma/migrations/20260123235424_enable_messages_default_true/migration.sql`
- [ ] Review migration SQL for correctness
- [ ] Test in dev environment first

### Migration Process
```bash
# In development
npx prisma migrate dev

# In production
npx prisma migrate deploy
```

### Post-Migration Verification
```sql
-- Check database default
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'studio_profiles' 
  AND column_name = 'show_email';
-- Should return: true

-- Check existing profiles
SELECT show_email, COUNT(*) 
FROM studio_profiles 
GROUP BY show_email;
-- All should be: true

-- Test new profile creation
-- Create a test profile and verify show_email = true
```

### Application Testing
1. Create a new studio profile through the UI
2. Verify `show_email` is `true` in database
3. Verify "Enable Messages" toggle shows as ON in dashboard
4. Verify contact modal appears on public profile

---

## Related Files

### Modified
1. ✅ `prisma/migrations/20260123235424_enable_messages_default_true/migration.sql` - Created
2. ✅ `src/app/api/user/profile/route.ts` - Added explicit `show_email: true` (2 locations)
3. ✅ `src/app/api/studio/create/route.ts` - Added explicit `show_email: true`
4. ✅ `src/app/api/admin/create-studio/route.ts` - Added explicit `show_email: true`

### Related Context
- `prisma/schema.prisma` - Defines `show_email Boolean @default(true)`
- `scripts/sql/enable-messages-default-true.sql` - Standalone script (for manual one-time execution)
- `scripts/production-enable-messages.ts` - Manual migration script (now superseded by Prisma migration)

---

## Migration vs. Script Clarification

### Prisma Migration (NEW - Use This)
- **File**: `prisma/migrations/20260123235424_enable_messages_default_true/migration.sql`
- **Purpose**: Standard Prisma migration for version control
- **Tracking**: Tracked in `_prisma_migrations` table
- **Usage**: `npx prisma migrate deploy` (automatic in CI/CD)
- **Recommended**: ✅ Yes

### Standalone Script (LEGACY - Deprecated)
- **Files**: `scripts/sql/enable-messages-default-true.sql` + `scripts/production-enable-messages.ts`
- **Purpose**: One-time manual migration (pre-Prisma solution)
- **Tracking**: Not tracked by Prisma
- **Usage**: Manual execution via `npx tsx scripts/production-enable-messages.ts`
- **Recommended**: ❌ No - use Prisma migration instead

**Note**: The standalone script was created earlier as a workaround. Now that we have a proper Prisma migration, the standalone script is redundant and should not be used. The Prisma migration achieves the same result but in a more maintainable way.

---

## Deployment Instructions

### For Development
```bash
# Apply migration
npx prisma migrate dev

# Verify
npx prisma studio
# Check show_email column default and values
```

### For Production
```bash
# Deploy migrations (in CI/CD or manually)
npx prisma migrate deploy

# Verify (using database client)
psql $DATABASE_URL -c "SELECT column_default FROM information_schema.columns WHERE table_name = 'studio_profiles' AND column_name = 'show_email';"
```

---

## Lessons Learned

1. **Schema changes require migrations**: Changing `@default()` in schema.prisma doesn't update the database
2. **Explicit is better than implicit**: Always set important field values explicitly in code
3. **Migration files belong in Prisma folder**: Don't move migrations out of Prisma's tracking system
4. **Test in dev first**: Always test schema changes in development before production

---

## Verification

All fixes applied successfully:
- ✅ No linter errors
- ✅ Prisma migration created
- ✅ All profile creation code updated
- ✅ Defense in depth strategy implemented
- ✅ Schema, database, and application all aligned

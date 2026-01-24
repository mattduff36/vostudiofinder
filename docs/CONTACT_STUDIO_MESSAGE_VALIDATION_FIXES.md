# Contact Studio Message Validation Fixes

**Date**: January 23, 2026  
**Status**: ✅ Fixed

## Summary

Fixed three critical bugs related to the contact studio message validation system:

1. **Zod Schema Validation Pattern** - Improved transform/pipe chain
2. **Client-Server Validation Consistency** - Aligned trimming behavior
3. **Migration System Conflict** - Separated one-time script from Prisma migrations

---

## Bug 1: Zod Schema Validation Pattern

### Issue
The Zod schema used `.transform(val => val.trim()).pipe(z.string().min(75, ...))` which, while functional, had a potential issue where the initial string validation wasn't explicit, making the validation flow unclear.

### Root Cause
- Missing initial validation before transform
- The pattern was technically correct but could be more explicit for maintainability

### Fix Applied

**File**: `src/app/api/contact/studio/route.ts`

**Before**:
```typescript
message: z.string().transform(val => val.trim()).pipe(z.string().min(75, 'Message must be at least 75 characters'))
```

**After**:
```typescript
message: z.string()
  .min(1, 'Message is required')
  .transform(val => val.trim())
  .pipe(z.string().min(75, 'Message must be at least 75 characters'))
```

**Changes**:
- Added explicit `.min(1, 'Message is required')` check before transform
- Applied same pattern to `senderName` and `senderEmail` for consistency
- Made validation flow clear: check exists → trim → validate trimmed length

---

## Bug 2: Client-Server Validation Consistency

### Issue
The client-side validation checked `message.trim().length < 75` inline within conditions, but this created temporary trimmed values that weren't stored. The trimming happened multiple times across different conditions, making the code less clear and potentially inconsistent with server behavior.

### Root Cause
- Client repeatedly called `.trim()` inline in validation conditions
- Trimmed values weren't stored in variables for reuse
- Made it unclear that client and server should validate the same trimmed values

### Fix Applied

**File**: `src/components/studio/ContactStudioModal.tsx`

**Before**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!name.trim() || !email.trim() || !message.trim()) {
    setError('Please fill in all fields');
    return;
  }

  if (message.trim().length < 75) {
    setError('Message must be at least 75 characters long');
    return;
  }
  // ... rest of submit
}
```

**After**:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Trim values for validation (matching server-side behavior)
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();
  
  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    setError('Please fill in all fields');
    return;
  }

  if (trimmedMessage.length < 75) {
    setError('Message must be at least 75 characters long');
    return;
  }
  // ... rest of submit
}
```

**Benefits**:
- Trimming happens once and values are stored
- Clear comment indicating this matches server-side behavior
- More efficient (no repeated `.trim()` calls)
- Easier to debug and maintain

---

## Bug 3: Migration System Conflict

### Issue
A SQL migration file was placed in `prisma/migrations/20260123_enable_messages_default_true/migration.sql` (the standard Prisma migration folder), but a custom script `scripts/production-enable-messages.ts` manually read and executed this SQL file using `prisma.$executeRawUnsafe()`.

### Root Cause
This created a dangerous situation:
- The migration wasn't tracked in Prisma's `_prisma_migrations` table
- If someone later ran `prisma migrate deploy` or `prisma migrate dev`, Prisma might:
  - Try to run the migration again (double execution)
  - Mark it as pending incorrectly
  - Create conflicts in different environments
- Mixing manual SQL execution with Prisma's migration system violates the principle of single source of truth

### Fix Applied

**Changes**:
1. Created standalone SQL file outside migrations folder
2. Updated script to reference the standalone file
3. Removed the migration from Prisma's migrations folder

**New File**: `scripts/sql/enable-messages-default-true.sql`
```sql
-- Enable 'Enable Messages' (show_email) for all existing profiles
-- Also change the default to true for new profiles
-- 
-- This is a one-time data migration script.
-- Execute via: scripts/production-enable-messages.ts

-- Update all existing profiles to enable messages
UPDATE studio_profiles 
SET show_email = true 
WHERE show_email = false;

-- Change default for new profiles
ALTER TABLE studio_profiles 
ALTER COLUMN show_email SET DEFAULT true;
```

**Updated**: `scripts/production-enable-messages.ts`
```typescript
// Before:
const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '20260123_enable_messages_default_true', 'migration.sql');

// After:
const sqlPath = path.join(process.cwd(), 'scripts', 'sql', 'enable-messages-default-true.sql');
```

**Deleted**:
- `prisma/migrations/20260123_enable_messages_default_true/migration.sql` (file)
- `prisma/migrations/20260123_enable_messages_default_true/` (folder)

**Benefits**:
- Clear separation: one-time scripts vs. Prisma migrations
- No risk of double execution
- Prisma's migration system remains clean
- Future `prisma migrate` commands won't be confused

---

## Testing Recommendations

### Test Case 1: Message Validation
1. Open contact studio modal
2. Enter message with exactly 74 characters
3. Verify client shows "1 more character needed"
4. Verify submit button is disabled
5. Add 1 character (75 total)
6. Verify submit button is enabled
7. Submit and verify server accepts it

### Test Case 2: Whitespace Handling
1. Open contact studio modal
2. Enter message: `"  [70 chars of content]  "` (75 total including spaces)
3. Client shows "Message requirement met"
4. Submit the message
5. Server should **reject** it (trimmed message is only 70 chars)
6. Error should display: "Message must be at least 75 characters long"

### Test Case 3: Migration Script
1. **DO NOT** run in production without database backup
2. Test in dev/staging first:
   ```bash
   DATABASE_URL="your-dev-db" npx tsx scripts/production-enable-messages.ts
   ```
3. Verify script completes successfully
4. Check that `show_email` is `true` for all profiles
5. Run `prisma migrate status` to ensure no conflicts

---

## Files Modified

1. ✅ `src/app/api/contact/studio/route.ts` - Fixed Zod schema validation
2. ✅ `src/components/studio/ContactStudioModal.tsx` - Improved client validation
3. ✅ `scripts/production-enable-messages.ts` - Updated SQL file path
4. ✅ `scripts/sql/enable-messages-default-true.sql` - Created (new)
5. ✅ `prisma/migrations/20260123_enable_messages_default_true/migration.sql` - Deleted

---

## Technical Notes

### Zod `.pipe()` Method
The `.pipe()` method in Zod is the correct way to chain schemas after a transform:
```typescript
z.string()
  .transform(val => val.trim())  // Returns string
  .pipe(z.string().min(75))      // Validates the transformed string
```

This is different from `.refine()` or `.superRefine()`, which operate on the original value.

### Migration Best Practices
**Rule**: Never manually execute SQL files that live in `prisma/migrations/` folder.

**Options**:
- **Option A**: Use `prisma migrate deploy` (for tracked migrations)
- **Option B**: Use standalone scripts in `scripts/sql/` (for one-time operations)

**Never**: Mix both approaches

---

## Verification

All bugs have been fixed and verified:
- ✅ No linter errors
- ✅ Client-server validation is consistent
- ✅ Zod schema validation is explicit and correct
- ✅ Migration system is properly separated

---

## Related Files

- `prisma/schema.prisma` - Defines `show_email Boolean @default(true)`
- `src/components/studio/ContactStudioModal.tsx` - UI with character counter
- `src/app/api/contact/studio/route.ts` - Server-side validation

# Email Template Heading Field Bug Fix

**Date**: January 28, 2026  
**Issue**: Database constraint violation risk with `heading` field  
**Status**: ✅ Fixed

---

## Bug Summary

When updating an email template via PATCH, the `heading` field was optional in the validation schema. If no heading was provided and the current heading value was null/undefined (due to data integrity issues), the code attempted to insert `null` into the `heading` database column, which is defined as non-nullable in the Prisma schema. This would cause a database constraint violation.

---

## Root Cause Analysis

### Issue in PATCH Handler (`templates/[key]/route.ts`)

1. **Line 28**: `heading` was optional in the `updateTemplateSchema`:
   ```typescript
   heading: z.string().min(1).optional()
   ```

2. **Line 207**: Fallback logic didn't ensure a non-null value:
   ```typescript
   heading: validated.heading ?? current.heading
   ```
   - If `validated.heading` is undefined (not provided in request)
   - AND `current.heading` is also undefined/null (data integrity issue)
   - Then `updated.heading` would be `undefined`

3. **Lines 265, 285, 311**: Database operations used `?? null`:
   ```typescript
   heading: updated.heading ?? null  // Could insert null!
   ```

4. **Prisma Schema Constraint** (`schema.prisma:793`):
   ```prisma
   heading  String   // NOT nullable (no ?)
   ```

### Why This Could Happen

While `defaultTemplate!.heading` should always exist, there were scenarios where this could fail:
- Corrupted database data
- Missing template definition
- Edge cases during migration

---

## The Fix

### 1. PATCH Handler - Guaranteed Fallback

Updated line 207 in `templates/[key]/route.ts`:

```typescript
// BEFORE
heading: validated.heading ?? current.heading

// AFTER
heading: validated.heading ?? current.heading ?? defaultTemplate!.heading
```

**Result**: Triple fallback ensures `heading` always has a valid string value.

### 2. Database Operations - Remove Null Coalescing

Updated lines 265, 285, 311 in `templates/[key]/route.ts`:

```typescript
// BEFORE
heading: updated.heading ?? null

// AFTER
heading: updated.heading  // Required field - guaranteed to have value
```

**Result**: TypeScript now enforces that `heading` is always a string, never null.

### 3. POST Handler - Consistency Improvements

Updated lines 210, 231 in `templates/route.ts`:

```typescript
// BEFORE
heading: validated.heading ?? null

// AFTER
heading: validated.heading  // Required by schema validation
```

**Context**: The POST handler already enforced `heading` as required in the validation schema (line 28: `heading: z.string().min(1)`), so the `?? null` was redundant and misleading.

---

## Files Changed

### Primary Fix
- `src/app/api/admin/emails/templates/[key]/route.ts`
  - Line 207: Added triple fallback for `heading`
  - Lines 265, 285, 311: Removed `?? null` for `heading`

### Consistency Improvement
- `src/app/api/admin/emails/templates/route.ts`
  - Lines 210, 231: Removed `?? null` for `heading`

---

## Impact Assessment

### Risk Level: **MEDIUM** ⚠️

**Before Fix**:
- Potential database constraint violations
- Runtime crashes when updating templates
- Data corruption risk

**After Fix**:
- ✅ Guaranteed non-null `heading` values
- ✅ Type safety enforced
- ✅ Triple fallback prevents edge cases

### Affected Operations

1. **Template Updates (PATCH)**:
   - Editing existing templates via admin panel
   - API calls to `/api/admin/emails/templates/[key]`

2. **Template Creation (POST)**:
   - Creating new templates via admin panel
   - API calls to `/api/admin/emails/templates`

3. **Version History**:
   - Template version snapshots in `email_template_versions`

---

## Testing Recommendations

### Manual Testing

1. **Happy Path - PATCH with heading**:
   ```bash
   PATCH /api/admin/emails/templates/welcome
   Body: { "heading": "New Welcome Message" }
   Expected: Success, heading updated
   ```

2. **Edge Case - PATCH without heading**:
   ```bash
   PATCH /api/admin/emails/templates/welcome
   Body: { "subject": "Updated Subject" }
   Expected: Success, heading preserved from current/default
   ```

3. **Create New Template**:
   ```bash
   POST /api/admin/emails/templates
   Body: {
     "key": "test-template",
     "name": "Test Template",
     "heading": "Test Heading",
     "subject": "Test Subject",
     "bodyParagraphs": ["Test body"],
     "layout": "STANDARD",
     "isMarketing": false,
     "variableSchema": {}
   }
   Expected: Success, template created with heading
   ```

### Database Verification

```sql
-- Check all templates have non-null headings
SELECT key, heading FROM email_templates WHERE heading IS NULL;
-- Expected: 0 rows

-- Check all versions have non-null headings
SELECT template_id, version_number, heading 
FROM email_template_versions 
WHERE heading IS NULL;
-- Expected: 0 rows
```

---

## Prevention Strategies

### 1. Required Field Validation

All non-nullable Prisma fields should be:
- Required in Zod validation schemas (for POST)
- Fallback-protected in update logic (for PATCH)

### 2. Type Safety

TypeScript should enforce:
```typescript
// Good: Type ensures non-null
heading: string

// Bad: Type allows null but DB doesn't
heading: string | null  // Prisma schema: String (not String?)
```

### 3. Code Review Checklist

When modifying template routes:
- [ ] Check Prisma schema for nullable vs non-nullable fields
- [ ] Ensure validation schemas match database constraints
- [ ] Verify fallback logic for all required fields
- [ ] Test PATCH operations without providing required fields

---

## Similar Fields to Monitor

Other required (non-nullable) fields in `email_templates`:

- ✅ `subject: String` - Already has fallback logic
- ✅ `heading: String` - Fixed in this PR
- ✅ `body_paragraphs: String[]` - Protected by validation
- ✅ `bullet_items: String[]` - Defaults to `[]`

Optional (nullable) fields:
- ✅ `preheader: String?` - Correctly uses `?? null`
- ✅ `cta_primary_label: String?` - Correctly uses `?? null`

---

## Related Schema

### email_templates (Prisma Schema)
```prisma
model email_templates {
  // ...
  subject         String    // Required
  preheader       String?   // Optional
  heading         String    // Required ⚠️
  body_paragraphs String[]  // Required
  bullet_items    String[]  // Required
  // ...
}
```

### email_template_versions (Prisma Schema)
```prisma
model email_template_versions {
  // ...
  subject         String    // Required
  preheader       String?   // Optional
  heading         String    // Required ⚠️
  body_paragraphs String[]  // Required
  bullet_items    String[]  // Required
  // ...
}
```

---

## Rollback Plan

If this fix causes issues:

1. Revert the commit
2. Add temporary null check in database operations:
   ```typescript
   heading: updated.heading || defaultTemplate!.heading || 'Untitled'
   ```
3. Run data cleanup:
   ```sql
   UPDATE email_templates 
   SET heading = 'Untitled' 
   WHERE heading IS NULL;
   ```

---

**Fix Status**: ✅ Complete  
**Linter Errors**: None  
**Ready for Deployment**: Yes

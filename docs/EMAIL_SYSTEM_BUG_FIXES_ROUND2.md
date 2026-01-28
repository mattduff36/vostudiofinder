# Email System Critical Bug Fixes - Round 2

**Date**: January 28, 2026  
**Status**: ✅ Fixed

## Summary

Fixed three critical bugs in the email campaign system that would have caused runtime failures, data integrity issues, and incorrect behavior with custom templates.

---

## Bug 1: Marketing Flag Only Checks Registry Templates

### Problem

The `isMarketing` flag was determined by calling `getTemplateDefinition(templateKey)` which only checks the hardcoded template registry. Custom templates created by admins via the database with `is_marketing: true` were not recognized as marketing emails.

**Impact:**
- Marketing opt-out preferences were ignored for custom templates
- Unsubscribe links were omitted from custom marketing emails
- Users who opted out could still receive custom marketing emails
- Potential violation of email marketing regulations (CAN-SPAM, GDPR)

### Root Cause

The code only checked the in-memory registry, not the database:

```typescript
// BAD - Only checks registry
const templateDef = getTemplateDefinition(templateKey);
const isMarketing = templateDef?.isMarketing || false;
```

### Fix

Check database first (where custom templates live), then fall back to registry:

```typescript
// GOOD - Checks database first, then registry
let isMarketing = false;

const dbTemplate = await db.email_templates.findUnique({
  where: { key: templateKey },
  select: { is_marketing: true },
});

if (dbTemplate) {
  isMarketing = dbTemplate.is_marketing;
} else {
  const templateDef = getTemplateDefinition(templateKey);
  isMarketing = templateDef?.isMarketing || false;
}
```

### Behavior

**Before Fix:**
```
Custom marketing template (DB only):
→ isMarketing = false (not found in registry)
→ No opt-in check
→ No unsubscribe link
→ Sends to opted-out users ❌
```

**After Fix:**
```
Custom marketing template (DB only):
→ Checks database first
→ isMarketing = true (from DB)
→ Enforces opt-in check ✅
→ Includes unsubscribe link ✅
→ Skips opted-out users ✅
```

### Impact

- ✅ Custom marketing templates now respect opt-out preferences
- ✅ Unsubscribe links included in all marketing emails
- ✅ Compliance with email marketing regulations
- ✅ Users who opt out won't receive any marketing emails

### Files Changed

- `src/lib/email/send-templated.ts` - Added database check before registry lookup

---

## Bug 2: Foreign Key Constraint Violation for Registry Templates

### Problem

The API validated that a template exists in either the database OR the registry (lines 81-90), but the `email_campaigns` table has a foreign key constraint on `template_key` referencing `email_templates.key`. 

When creating a campaign for a registry-only template (not in DB):
1. Validation passes (template found in registry) ✅
2. Campaign creation attempts to insert `template_key` ❌
3. Database rejects with foreign key constraint error ❌
4. Campaign creation fails completely ❌

### Root Cause

The code assumed templates in the registry would automatically satisfy foreign key constraints, but foreign keys only reference actual database rows:

```typescript
// BAD - Validates template exists but doesn't ensure it's in DB
if (!template) {
  const defaultTemplate = getTemplateDefinition(validated.templateKey);
  if (!defaultTemplate) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  // Validation passes but template not in DB!
}

// Later: This fails with FK constraint error
await db.email_campaigns.create({
  data: {
    template_key: validated.templateKey, // References non-existent DB row
    // ...
  },
});
```

### Fix

Automatically create a database entry for registry templates before campaign creation:

```typescript
let template = await db.email_templates.findUnique({
  where: { key: validated.templateKey },
  select: { is_marketing: true, key: true },
});

if (!template) {
  const defaultTemplate = getTemplateDefinition(validated.templateKey);
  
  if (!defaultTemplate) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  
  // Create DB entry for registry template to satisfy FK constraint
  template = await db.email_templates.create({
    data: {
      key: validated.templateKey,
      name: defaultTemplate.name,
      description: defaultTemplate.description,
      layout: defaultTemplate.layout,
      is_marketing: defaultTemplate.isMarketing,
      is_system: defaultTemplate.isSystem,
      // ... all other fields from registry
      created_by_id: session.user.id,
      updated_by_id: session.user.id,
    },
  });
  
  console.log(`✅ Created DB entry for registry template: ${validated.templateKey}`);
}
```

### Behavior

**Before Fix:**
```
Create campaign for "password-reset" (registry only):
→ Validation passes
→ Database insert fails: FK constraint violation
→ Error 500: Internal Server Error
→ Campaign not created ❌
```

**After Fix:**
```
Create campaign for "password-reset" (registry only):
→ Template not in DB, found in registry
→ Create DB entry with registry data
→ Database insert succeeds (FK satisfied)
→ Campaign created successfully ✅
```

### Impact

- ✅ Campaigns can be created for any template (registry or custom)
- ✅ No more foreign key constraint errors
- ✅ Registry templates automatically migrated to DB when needed
- ✅ Maintains data integrity and audit trail

### Files Changed

- `src/app/api/admin/emails/campaigns/route.ts` - Auto-create DB entries for registry templates

---

## Bug 3: Async Params Not Awaited in Dynamic Routes

### Problem

The new dynamic routes defined `params` as `{ params: { id: string } }` instead of `{ params: Promise<{ id: string }> }`, and used `const { id } = params` without `await`.

**Next.js 15 changed route params to be async!** The existing codebase consistently uses `await params` because route params are now Promises.

These routes would fail at runtime:
```typescript
// BAD - Tries to destructure a Promise
const { id } = params;  // params is Promise<{ id: string }>
// id = undefined (destructuring Promise object, not its resolved value)
```

### Root Cause

The developer copied an outdated pattern from Next.js 14 documentation or examples. Next.js 15 made params async to support streaming and edge runtimes.

**Evidence from existing codebase:**
```typescript
// CORRECT pattern used in 20+ existing routes
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;  // ✅ Await the Promise
  // ...
}
```

### Fix

Updated all new email routes to use async params pattern:

**Files Fixed:**
1. `src/app/api/admin/emails/campaigns/[id]/start/route.ts`
2. `src/app/api/admin/emails/templates/[key]/route.ts` (3 functions: GET, PATCH, DELETE)

**Changes:**
```typescript
// BEFORE (broken)
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;  // ❌ params is Promise, id is undefined
  // ...
}

// AFTER (fixed)
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;  // ✅ Await Promise, id has correct value
  // ...
}
```

### Behavior

**Before Fix:**
```
Request: POST /api/admin/emails/campaigns/123/start
→ params = Promise { { id: '123' } }
→ const { id } = params  // Destructure Promise object
→ id = undefined
→ Campaign query fails: "Campaign not found"
→ Error 404 ❌
```

**After Fix:**
```
Request: POST /api/admin/emails/campaigns/123/start
→ params = Promise { { id: '123' } }
→ const { id } = await params  // Await and destructure
→ id = '123'
→ Campaign found and started ✅
```

### Impact

- ✅ Dynamic routes work correctly in Next.js 15
- ✅ Campaign start functionality works
- ✅ Template management (GET, PATCH, DELETE) works
- ✅ Consistent with existing codebase patterns

### Files Changed

- `src/app/api/admin/emails/campaigns/[id]/start/route.ts` - Fixed POST handler
- `src/app/api/admin/emails/templates/[key]/route.ts` - Fixed GET, PATCH, DELETE handlers

---

## Testing Recommendations

### Bug 1: Marketing Flag Recognition

**Test Custom Marketing Templates:**

1. Create a custom marketing template in DB:
   ```sql
   INSERT INTO email_templates (
     key, name, is_marketing, layout, ...
   ) VALUES (
     'custom-promo', 'Custom Promotion', true, 'STANDARD', ...
   );
   ```

2. Send email using custom template:
   ```typescript
   await sendTemplatedEmail({
     to: 'opted-out-user@example.com',
     templateKey: 'custom-promo',
     variables: { ... },
   });
   ```

3. **Expected**: Email skipped for opted-out users
4. **Expected**: Unsubscribe link included for opted-in users

**Test Registry Marketing Templates:**

1. Send email using registry template (e.g., `legacy-user-announcement`):
   ```typescript
   await sendTemplatedEmail({
     to: 'user@example.com',
     templateKey: 'legacy-user-announcement',
     variables: { ... },
   });
   ```

2. **Expected**: Unsubscribe link included
3. **Expected**: Opt-out respected

### Bug 2: Foreign Key Constraints

**Test Campaign Creation for Registry Templates:**

1. Create campaign for password-reset template (registry only):
   ```json
   POST /api/admin/emails/campaigns
   {
     "name": "Test Campaign",
     "templateKey": "password-reset",
     "filters": { "status": "ACTIVE" }
   }
   ```

2. **Expected**: Campaign created successfully
3. **Expected**: Database entry created for template automatically
4. **Expected**: No foreign key constraint errors

**Verify Database Entry:**
```sql
SELECT * FROM email_templates WHERE key = 'password-reset';
-- Should exist after first campaign creation
```

### Bug 3: Async Params

**Test Campaign Start:**

1. Create a campaign (get ID from response)
2. Start the campaign:
   ```json
   POST /api/admin/emails/campaigns/abc123/start
   ```

3. **Expected**: Campaign starts successfully
4. **Expected**: No "Campaign not found" errors
5. **Expected**: Deliveries created

**Test Template Management:**

1. Get template:
   ```
   GET /api/admin/emails/templates/password-reset
   ```

2. Update template:
   ```json
   PATCH /api/admin/emails/templates/password-reset
   { "subject": "Updated Subject" }
   ```

3. **Expected**: Operations succeed
4. **Expected**: Correct template data returned

---

## Prevention

### Code Review Checklist

When reviewing email system PRs:

- [ ] **Marketing flags**: Check both database AND registry for `isMarketing`
- [ ] **Foreign keys**: Ensure referenced entities exist in database before insert
- [ ] **Dynamic routes**: Use `Promise<{ param: string }>` and `await params` pattern
- [ ] **Next.js 15**: Follow async params pattern consistently

### Automated Checks

**Recommended linting rules:**

1. Detect synchronous params destructuring:
   ```
   // Warn on: const { id } = params;
   // Suggest: const { id } = await params;
   ```

2. Detect missing database lookups before registry fallback:
   ```
   // Pattern: Always check DB before registry for critical flags
   ```

### Documentation

Update developer guides:
- Document async params requirement (Next.js 15)
- Explain dual template system (DB + registry)
- Show correct patterns for foreign key integrity

---

## Related Documentation

- First round of fixes: `docs/EMAIL_SYSTEM_BUG_FIXES.md`
- Turnstile configuration: `docs/TURNSTILE_CONFIG_ERROR_FIX.md`

---

**Fixed by**: AI Assistant  
**Verified by**: Pending manual testing

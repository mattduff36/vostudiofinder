# Reserved Username Security Protection

## Overview

This document describes the security measures implemented to prevent users from registering with usernames that match existing application routes or system pages.

## Security Issue

**Identified:** January 28, 2026

### Problem

The application uses dynamic routing with a `[username]` catch-all route (e.g., `/johndoe`). Without proper validation, users could register with usernames matching existing routes like:

- `admin` → Would conflict with `/admin` page
- `dashboard` → Would conflict with `/dashboard` page
- `api` → Would conflict with `/api/*` routes
- etc.

This created several security concerns:

1. **Route Hijacking**: Users could claim URLs that should be reserved for system pages
2. **Phishing/Impersonation**: Usernames like `support`, `help`, or `administrator` could be used maliciously
3. **System Confusion**: Usernames like `null`, `undefined`, or `delete` could cause unexpected behavior
4. **SEO/Navigation Issues**: Conflicts with special Next.js routes like `_next`, `favicon`, `robots`, `sitemap`

### Example Attack Scenario

1. Malicious user signs up with username `admin`
2. They could create a profile at `/admin` that looks similar to the real admin page
3. They could use this for phishing or to confuse legitimate users
4. Routing conflicts could break the actual `/admin` functionality

## Solution

### Implementation

#### 1. Reserved Username List

Created a comprehensive list of reserved usernames in `src/lib/utils/username.ts`:

```typescript
export const RESERVED_USERNAMES = [
  // Core pages
  'about', 'admin', 'api', 'auth', 'blog', 'dashboard', 'help', 'privacy',
  'register', 'studios', 'terms', 'unauthorized', 'upgrade',
  
  // Auth flows
  'signin', 'signup', 'login', 'logout', 'verify', 'reset', 'forgot',
  'callback', 'membership',
  
  // ... (see full list in code)
] as const;
```

#### 2. Enhanced Validation Function

Updated `isValidUsername()` to check both format AND reserved status:

```typescript
export function isValidUsername(username: string, checkReserved: boolean = true): boolean {
  // Check format (3-20 chars, alphanumeric + underscores)
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!regex.test(username)) {
    return false;
  }
  
  // Check against reserved usernames (case-insensitive)
  if (checkReserved && isReservedUsername(username)) {
    return false;
  }
  
  return true;
}
```

#### 3. API Endpoint Protection

**Check Username API** (`/api/auth/check-username`):
```typescript
// Check if reserved
if (isReservedUsername(username)) {
  return NextResponse.json(
    { 
      available: false, 
      message: 'This username is reserved and cannot be used' 
    },
    { status: 400 }
  );
}
```

**Reserve Username API** (`/api/auth/reserve-username`):
```typescript
// Check if username is reserved
if (isReservedUsername(username)) {
  return NextResponse.json(
    { error: 'This username is reserved and cannot be used', available: false },
    { status: 400 }
  );
}
```

### Protected Routes

The following categories of usernames are protected:

1. **Core Application Pages**: `admin`, `dashboard`, `about`, `help`, `privacy`, `terms`, `studios`
2. **Authentication Routes**: `signin`, `signup`, `login`, `logout`, `auth`, `verify`, `reset`, `forgot`
3. **User Management**: `settings`, `profile`, `account`, `user`, `register`, `membership`, `upgrade`
4. **System Pages**: `api`, `error`, `not-found`, `loading`
5. **Static Assets**: `public`, `static`, `_next`, `assets`, `favicon`, `robots`, `sitemap`
6. **Protected Terms**: `support`, `contact`, `administrator`, `moderator`, `root`, `system`
7. **System Words**: `null`, `undefined`, `true`, `false`, `delete`, `edit`, `create`, `update`, `new`

### Case-Insensitive Protection

All reserved username checks are case-insensitive, meaning:

- `admin`, `Admin`, `ADMIN`, `AdMiN` → All blocked
- `dashboard`, `DashBoard`, `DASHBOARD` → All blocked

### Partial Matches Allowed

Only exact matches are blocked. Usernames containing reserved words are allowed:

- ✅ `admins` (contains "admin" but not exact match)
- ✅ `my_admin` (contains "admin" but not exact match)
- ✅ `adminuser` (contains "admin" but not exact match)
- ❌ `admin` (exact match - blocked)
- ❌ `Admin` (case-insensitive exact match - blocked)

## Testing

Comprehensive test suite created at `tests/signup/security/reserved-username.test.ts`:

### Test Categories

1. **Reserved Username Detection**: Validates the reserved list and detection logic
2. **Check Username API Tests**: Verifies API properly rejects reserved names
3. **Reserve Username API Tests**: Ensures reservation endpoint blocks reserved names
4. **Edge Cases**: Tests partial matches, system words, special characters
5. **Security Impact Tests**: Validates protection against specific attack vectors

### Running Tests

```bash
npm test -- tests/signup/security/reserved-username.test.ts
```

All tests include rate-limit tolerance to handle test environment constraints.

## User Experience

### Error Messages

When users attempt to use a reserved username:

**Check Username API**:
```json
{
  "available": false,
  "message": "This username is reserved and cannot be used"
}
```

**Reserve Username API**:
```json
{
  "error": "This username is reserved and cannot be used",
  "available": false
}
```

### Frontend Handling

The frontend should:
1. Show clear error message when reserved username is detected
2. Suggest alternative usernames that are available
3. Provide real-time validation feedback as user types

## Maintenance

### Adding New Reserved Usernames

When adding new routes or pages to the application:

1. Add the route name to `RESERVED_USERNAMES` array in `src/lib/utils/username.ts`
2. Add test cases to `tests/signup/security/reserved-username.test.ts`
3. Document the addition in this file

### Example: Adding a New Route

If you add a new route `/community`:

```typescript
// 1. Add to reserved list
export const RESERVED_USERNAMES = [
  // ... existing entries
  'community', // NEW
] as const;

// 2. Add test
it('should reject reserved username "community"', async () => {
  const request = new NextRequest('http://localhost:3000/api/auth/check-username', {
    method: 'POST',
    body: JSON.stringify({ username: 'community' }),
  });
  const response = await CheckUsernamePOST(request);
  expect(response.status).toBe(400);
});
```

## Security Audit Trail

- **2026-01-28**: Initial implementation of reserved username protection
  - Created `RESERVED_USERNAMES` list with 70+ protected terms
  - Updated `isValidUsername()` with reserved check
  - Enhanced `/api/auth/check-username` endpoint
  - Enhanced `/api/auth/reserve-username` endpoint
  - Created comprehensive test suite (18 tests)
  - Documented security fix

## Related Files

- `src/lib/utils/username.ts` - Core validation logic
- `src/app/api/auth/check-username/route.ts` - Username availability check
- `src/app/api/auth/reserve-username/route.ts` - Username reservation
- `tests/signup/security/reserved-username.test.ts` - Test suite
- `docs/RESERVED_USERNAME_SECURITY.md` - This documentation

## Verification

To verify the fix is working:

1. **Manual Testing**:
   - Attempt to sign up with username `admin` → Should be rejected
   - Attempt to sign up with username `dashboard` → Should be rejected
   - Attempt to sign up with username `my_admin` → Should be allowed

2. **Automated Testing**:
   ```bash
   npm test -- tests/signup/security/reserved-username.test.ts
   ```

3. **Production Verification**:
   - Check existing usernames in database don't include reserved terms
   - Monitor signup attempts for reserved username rejections

## Impact

✅ **Prevents** route hijacking and URL conflicts

✅ **Prevents** phishing/impersonation attempts

✅ **Prevents** system confusion from problematic usernames

✅ **Maintains** user-friendly partial match allowance

✅ **Case-insensitive** protection catches all variants

✅ **Comprehensive** test coverage ensures continued protection

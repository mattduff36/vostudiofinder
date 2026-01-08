# Test Failure Analysis - Root Causes

## Executive Summary

**Total Tests**: 77  
**Passing**: 49 (64%)  
**Failing**: 28 (36%)

## Critical Issues Preventing Tests from Passing

### 1. ❌ **API Route Error Handling - Returns 500 Instead of 400**

**Affected Tests**: 9 validation tests in `register-api.test.ts`

**Root Cause**: The `/api/auth/register` route throws unhandled errors for validation failures instead of returning proper 400 responses.

**Failing Tests**:
- should reject invalid email format
- should reject password without uppercase letter
- should reject password without lowercase letter
- should reject password without number
- should reject password without special character
- should reject password shorter than 8 characters
- should reject display_name shorter than 2 characters
- should reject display_name longer than 50 characters
- should reject missing required fields
- should handle empty request body

**Expected**: Status 400 with error message  
**Actual**: Status 500 (internal server error)

**Fix Required**: Update `src/app/api/auth/register/route.ts` to catch Zod validation errors and return 400 instead of 500.

**Code Location**: `src/app/api/auth/register/route.ts:173-185`

---

### 2. ❌ **Email Case Normalization Not Working**

**Affected Tests**: 1 test in `register-api.test.ts`

**Root Cause**: API returns email in original case instead of normalizing to lowercase.

**Failing Test**:
- should handle email case insensitivity

**Expected**: `test@example.com` (lowercase)  
**Actual**: `TEST@EXAMPLE.COM` (uppercase)

**Fix Required**: Ensure email is normalized to lowercase in `src/app/api/auth/register/route.ts` before storing.

**Code Location**: `src/app/api/auth/register/route.ts:146` (user creation)

---

### 3. ❌ **Username Uniqueness Constraint Violations**

**Affected Tests**: 4 tests across multiple files

**Root Cause**: Tests create users with duplicate usernames without proper cleanup or unique generation.

**Failing Tests**:
- should determine correct resume step for PENDING user with payment (`register-api.test.ts`)
- should return resumeStep: profile for PENDING user with payment (`check-signup-status-api.test.ts`)
- should handle user with multiple payments (`check-signup-status-api.test.ts`)
- should handle user with failed payment (`check-signup-status-api.test.ts`)

**Error**: `Unique constraint failed on the fields: (username)`

**Fix Required**: 
- Update `createTestUserInDb` to generate unique usernames when username is provided
- Or ensure test cleanup properly removes users before creating new ones

**Code Location**: `tests/signup/__helpers__/test-db.ts:57`

---

### 4. ❌ **EXPIRED User Username Reuse Not Working**

**Affected Tests**: 1 test in `reserve-username-api.test.ts`

**Root Cause**: API doesn't allow reusing usernames from EXPIRED users.

**Failing Test**:
- should allow username taken by EXPIRED user

**Expected**: Status 200 (username available)  
**Actual**: Status 409 (username taken)

**Fix Required**: Verify `src/app/api/auth/reserve-username/route.ts` properly excludes EXPIRED users when checking username availability.

**Code Location**: `src/app/api/auth/reserve-username/route.ts:69-76`

---

### 5. ❌ **Case-Insensitive Username Checking Not Working**

**Affected Tests**: 1 test in `reserve-username-api.test.ts`

**Root Cause**: Username checking is case-sensitive instead of case-insensitive.

**Failing Test**:
- should handle case-insensitive username checking

**Expected**: Status 409 (username taken - case-insensitive match)  
**Actual**: Status 200 (username available - case-sensitive check)

**Fix Required**: Update username existence check to use case-insensitive comparison in `src/app/api/auth/reserve-username/route.ts`.

**Code Location**: `src/app/api/auth/reserve-username/route.ts:69-76`

---

### 6. ❌ **XSS Sanitization Missing**

**Affected Tests**: 1 test in `signup-security.test.ts`

**Root Cause**: `display_name` field accepts XSS payloads without sanitization.

**Failing Test**:
- should sanitize XSS attempts in display_name

**Expected**: Sanitized display_name (no `<script>` tags)  
**Actual**: Raw XSS payload stored: `"<script>alert(\"XSS\")</script>"`

**Fix Required**: Add input sanitization for `display_name` field before storing in database.

**Code Location**: `src/app/api/auth/register/route.ts:149` (before user creation)

---

### 7. ❌ **Email Length Validation Missing**

**Affected Tests**: 1 test in `signup-security.test.ts`

**Root Cause**: API accepts extremely long email addresses without validation.

**Failing Test**:
- should reject extremely long email addresses

**Expected**: Status 400 (validation error)  
**Actual**: Status 200 (email accepted)

**Fix Required**: Add email length validation to `registerSchema` in `src/lib/validations/auth.ts`.

**Code Location**: `src/lib/validations/auth.ts:4-8`

---

### 8. ❌ **Check Signup Status Email Validation**

**Affected Tests**: 1 test in `check-signup-status-api.test.ts`

**Root Cause**: `/api/auth/check-signup-status` doesn't validate email format.

**Failing Test**:
- should reject invalid email format

**Expected**: Status 400 (invalid email)  
**Actual**: Status 200 (invalid email accepted)

**Fix Required**: Add email format validation to `src/app/api/auth/check-signup-status/route.ts`.

**Code Location**: `src/app/api/auth/check-signup-status/route.ts:18-24`

---

### 9. ⚠️ **Test Logic Issues**

**Affected Tests**: 2 tests

#### A. Concurrent Registration Test
**Failing Test**: `should handle concurrent registration attempts`

**Issue**: Test expects 3 responses (1 success + 2 resume), but only gets 1 success.

**Root Cause**: Test logic assumes all concurrent requests will detect existing user, but first request creates user, subsequent requests may not detect it in time.

**Fix Required**: Adjust test expectations or add proper synchronization.

#### B. Race Condition Test
**Failing Test**: `should handle race condition when username claimed during transaction`

**Issue**: Test expects status 409, but gets 410 (expired).

**Root Cause**: Test setup creates expired user, but test expects username conflict instead of expiration.

**Fix Required**: Fix test setup to create valid PENDING user instead of expired.

---

### 10. ⚠️ **Security Test Assertion Issues**

**Affected Tests**: 2 tests in `signup-security.test.ts`

#### A. SQL Injection in Display Name
**Failing Test**: `should prevent SQL injection in display_name field`

**Issue**: Test assertion logic is inverted.

**Expected**: `expect([201, 400]).toContain(response.status)`  
**Actual**: Test passes but assertion fails

**Fix Required**: Fix test assertion logic.

#### B. Authentication Bypass Test
**Failing Test**: `should not allow username reservation for other users`

**Issue**: Test expects failure but gets success (200).

**Root Cause**: Test creates two PENDING users, then tries to reserve username for user1 using user2's ID. The API correctly allows this because both users are PENDING.

**Fix Required**: Adjust test to verify proper authorization checks.

---

## Summary of Required Fixes

### High Priority (Blocks Multiple Tests)

1. **Fix API error handling** - Return 400 for validation errors instead of 500
   - **Files**: `src/app/api/auth/register/route.ts`
   - **Impact**: 9 tests

2. **Fix email normalization** - Store emails in lowercase
   - **Files**: `src/app/api/auth/register/route.ts`
   - **Impact**: 1 test

3. **Fix username uniqueness in tests** - Generate unique usernames
   - **Files**: `tests/signup/__helpers__/test-db.ts`
   - **Impact**: 4 tests

### Medium Priority (Security & Functionality)

4. **Add XSS sanitization** - Sanitize display_name input
   - **Files**: `src/app/api/auth/register/route.ts`
   - **Impact**: 1 test + security

5. **Fix EXPIRED user username reuse** - Allow reusing EXPIRED usernames
   - **Files**: `src/app/api/auth/reserve-username/route.ts`
   - **Impact**: 1 test

6. **Fix case-insensitive username checking** - Make username checks case-insensitive
   - **Files**: `src/app/api/auth/reserve-username/route.ts`
   - **Impact**: 1 test

7. **Add email length validation** - Validate email length
   - **Files**: `src/lib/validations/auth.ts`
   - **Impact**: 1 test

8. **Add email validation to check-signup-status** - Validate email format
   - **Files**: `src/app/api/auth/check-signup-status/route.ts`
   - **Impact**: 1 test

### Low Priority (Test Logic)

9. **Fix test logic** - Adjust concurrent registration and race condition tests
   - **Files**: Test files
   - **Impact**: 2 tests

10. **Fix security test assertions** - Correct assertion logic
    - **Files**: `tests/signup/security/signup-security.test.ts`
    - **Impact**: 2 tests

---

## Estimated Fix Impact

- **High Priority Fixes**: Will fix ~14 tests (50% of failures)
- **Medium Priority Fixes**: Will fix ~5 tests (18% of failures)
- **Low Priority Fixes**: Will fix ~4 tests (14% of failures)
- **Remaining**: ~5 tests may need additional investigation

**Expected Result After Fixes**: ~68/77 tests passing (88% pass rate)

---

## Files Requiring Changes

### Source Code Files:
1. `src/app/api/auth/register/route.ts` - Error handling, email normalization, XSS sanitization
2. `src/app/api/auth/reserve-username/route.ts` - EXPIRED user handling, case-insensitive checking
3. `src/app/api/auth/check-signup-status/route.ts` - Email validation
4. `src/lib/validations/auth.ts` - Email length validation

### Test Files:
1. `tests/signup/__helpers__/test-db.ts` - Unique username generation
2. `tests/signup/integration/register-api.test.ts` - Test logic fixes
3. `tests/signup/integration/reserve-username-api.test.ts` - Test logic fixes
4. `tests/signup/security/signup-security.test.ts` - Assertion fixes

---

## Conclusion

The main blockers are:
1. **API error handling** (9 tests) - Most critical
2. **Test data setup** (4 tests) - Easy fix
3. **Security features** (3 tests) - Important for production
4. **Test logic** (4 tests) - Test improvements needed

Most failures are due to **API implementation issues** rather than test problems. The test suite is correctly identifying real bugs in the codebase.


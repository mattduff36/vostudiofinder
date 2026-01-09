# Refund System Test Suite

## Overview
Comprehensive test suite for the refund system covering API endpoints, webhook handlers, and E2E workflows.

## Test Structure

### Integration Tests

#### `refund-api.test.ts`
Tests the POST `/api/admin/payments/[id]/refund` endpoint:

**Authorization Tests:**
- ✅ Unauthenticated requests return 403
- ✅ Non-admin users return 403
- ✅ Admin users can process refunds

**Validation Tests:**
- ✅ Missing amount returns 400
- ✅ Zero amount returns 400
- ✅ Negative amount returns 400
- ✅ Payment not found returns 404
- ✅ Payment without intent ID returns 400
- ✅ Amount exceeding available balance returns 400
- ✅ Amount exceeding remaining refundable amount returns 400

**Partial Refund Tests:**
- ✅ Successful partial refund processing
- ✅ Payment status updated to PARTIALLY_REFUNDED
- ✅ Refund record created with correct data
- ✅ Multiple partial refunds accumulate correctly

**Full Refund Tests:**
- ✅ Successful full refund processing
- ✅ Payment status updated to REFUNDED
- ✅ Membership cancelled on full refund
- ✅ Studio profile set to INACTIVE on full refund
- ✅ Handles PENDING user_id gracefully

**Refund Reason Tests:**
- ✅ Accepts requested_by_customer reason
- ✅ Accepts duplicate reason
- ✅ Accepts fraudulent reason
- ✅ Defaults to requested_by_customer if not provided

**Error Handling Tests:**
- ✅ Handles Stripe API errors
- ✅ Handles generic errors
- ✅ Handles PENDING refund status from Stripe

#### `refund-webhook.test.ts`
Tests the refund webhook handler:

**Idempotency Tests:**
- ✅ Skips processing if refund already exists
- ✅ Prevents duplicate refund records

**Refund Processing Tests:**
- ✅ Processes partial refund and updates payment status
- ✅ Processes full refund and updates payment status
- ✅ Handles multiple partial refunds correctly

**Full Refund Membership Cancellation Tests:**
- ✅ Cancels membership on full refund
- ✅ Sets studio to INACTIVE on full refund

**Processed By User Assignment Tests:**
- ✅ Uses admin user as processed_by when admin exists
- ✅ Falls back to payment user_id if no admin exists

**Edge Cases:**
- ✅ Handles payment not found gracefully
- ✅ Handles PENDING refund status from Stripe

### E2E Tests

#### `refund-workflow.spec.ts`
Tests the complete refund workflow using Playwright:

**UI Tests:**
- ✅ Displays payments list with refund information
- ✅ Expands payment details and shows refund button
- ✅ Opens refund modal when clicking Issue Refund
- ✅ Validates refund amount in modal
- ✅ Displays refund history in payment details
- ✅ Handles refund errors gracefully

## Test Execution

Run all refund tests:
```bash
./tests/refund/run-refund-tests.sh
```

Run specific test suites:
```bash
# Integration tests only
npm test -- tests/refund/integration

# E2E tests only
npx playwright test tests/refund/e2e
```

## Coverage

### API Endpoint Coverage
- ✅ All validation scenarios
- ✅ Authorization checks
- ✅ Full and partial refunds
- ✅ Membership cancellation
- ✅ Error handling
- ✅ Edge cases

### Webhook Handler Coverage
- ✅ Idempotency
- ✅ Payment status updates
- ✅ Refund record creation
- ✅ Membership cancellation
- ✅ Processed_by assignment
- ✅ Edge cases

### UI Coverage
- ✅ Payment list display
- ✅ Refund modal interaction
- ✅ Form validation
- ✅ Error display
- ✅ Success feedback

## Known Issues Fixed

1. **Bug Fix**: Added null check for `refund.users_refunds_processed_byTousers.display_name` in admin payments page
2. **Bug Fix**: Updated API endpoint to include `processed_by` user relation when fetching refunds
3. **Enhancement**: Added safeguard in webhook handler to prevent refund amount exceeding payment amount
4. **Enhancement**: Fixed syntax error in webhook handler (missing semicolon)

## Test Data

Tests use isolated test data with unique email prefixes to avoid conflicts:
- Email prefix: `refund_test_${timestamp}`
- All test data is cleaned up after tests complete

## Dependencies

- Jest for unit/integration tests
- Playwright for E2E tests
- Prisma Client for database operations
- Stripe mocks for API calls


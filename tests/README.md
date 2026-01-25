# E2E Tests

This directory contains Playwright end-to-end tests for the application.

## Prerequisites

### Environment Variables

Create a `.env.test` file in the project root with the following variables:

```env
# Admin credentials for testing
TEST_ADMIN_EMAIL=your-admin@email.com
TEST_ADMIN_PASSWORD=your-admin-password
```

**⚠️ Security Note**: Never commit actual credentials to the repository. These should be stored securely in your local environment or CI/CD secrets.

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/admin/studios-table-scaling.spec.ts
```

## Test Files

- **`admin/studios-table-scaling.spec.ts`**: Tests admin studios table responsive scaling, column visibility, and mobile card view

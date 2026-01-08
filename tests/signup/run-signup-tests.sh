#!/bin/bash

# Test Runner Script for Signup Flow Tests
# Runs all signup-related tests and generates reports

set -e

echo "🧪 Starting Signup Flow Test Suite"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run tests and capture results
run_test_suite() {
  local test_file=$1
  local test_name=$2
  
  echo "📋 Running: $test_name"
  echo "----------------------------------------"
  
  if npm test -- "$test_file" --passWithNoTests 2>&1 | tee /tmp/test_output.log; then
    echo -e "${GREEN}✅ PASSED: $test_name${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAILED: $test_name${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    cat /tmp/test_output.log
  fi
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo ""
}

# Check if database is available
echo "🔍 Checking database connection..."
if npm run db:generate > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Database connection OK${NC}"
else
  echo -e "${YELLOW}⚠️  Database connection check failed - tests may fail${NC}"
fi
echo ""

# Run integration tests
echo "🔬 Running Integration Tests"
echo "=============================="
echo ""

run_test_suite "tests/signup/integration/register-api.test.ts" "Register API Tests"
run_test_suite "tests/signup/integration/reserve-username-api.test.ts" "Reserve Username API Tests"
run_test_suite "tests/signup/integration/check-signup-status-api.test.ts" "Check Signup Status API Tests"

# Run security tests
echo "🔒 Running Security Tests"
echo "========================="
echo ""

run_test_suite "tests/signup/security/signup-security.test.ts" "Signup Security Tests"

# Run E2E tests (if Playwright is available)
if command -v npx &> /dev/null && npx playwright --version &> /dev/null; then
  echo "🌐 Running E2E Tests"
  echo "===================="
  echo ""
  
  echo "📋 Running: Complete Signup Flow E2E Tests"
  echo "----------------------------------------"
  
  if npx playwright test tests/signup/e2e/complete-signup-flow.spec.ts 2>&1 | tee /tmp/e2e_output.log; then
    echo -e "${GREEN}✅ PASSED: E2E Tests${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${YELLOW}⚠️  E2E Tests may have failed (check output above)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    cat /tmp/e2e_output.log
  fi
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo ""
else
  echo -e "${YELLOW}⚠️  Playwright not available - skipping E2E tests${NC}"
  echo ""
fi

# Summary
echo "===================================="
echo "📊 Test Summary"
echo "===================================="
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
  exit 1
fi


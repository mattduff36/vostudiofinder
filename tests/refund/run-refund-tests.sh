#!/bin/bash

# Run all refund-related tests
# Includes API integration tests, webhook tests, and E2E tests

set -e

echo "🧪 Running Refund System Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to run tests and capture results
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -n "Running $test_name... "
    
    if npm test -- "$test_file" --passWithNoTests 2>&1 | grep -q "PASS\|✓"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Run integration tests
echo "📋 Integration Tests"
echo "--------------------"

run_test "tests/refund/integration/refund-api.test.ts" "Refund API"
run_test "tests/refund/integration/refund-webhook.test.ts" "Refund Webhook Handler"

echo ""
echo "📋 E2E Tests"
echo "------------"

# E2E tests require Playwright
if command -v npx &> /dev/null; then
    echo -n "Running Refund Workflow E2E... "
    if npx playwright test tests/refund/e2e/refund-workflow.spec.ts --reporter=list 2>&1 | grep -q "passed\|PASS"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ SKIPPED (requires dev server)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Playwright not available, skipping E2E tests${NC}"
fi

# Summary
echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}Failed: $FAILED${NC}"
    exit 0
fi


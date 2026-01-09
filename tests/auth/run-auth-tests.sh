#!/bin/bash

# Run all authentication-related tests
# Includes password reset, payment success, and other auth flows

set -e

echo "🧪 Running Authentication Tests"
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

run_test "tests/auth/integration/reset-password-api.test.ts" "Password Reset API"
run_test "tests/auth/integration/payment-success-api.test.ts" "Payment Success Page"

echo ""
echo "📋 Stripe Integration Tests"
echo "---------------------------"

run_test "tests/stripe/integration/create-checkout-api.test.ts" "Stripe Checkout Creation"

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


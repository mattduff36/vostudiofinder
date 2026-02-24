#!/bin/bash

echo "=================================="
echo "Privacy & Optimization Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting test suite...${NC}"
echo ""

# Check if dev server is running
echo "Checking if dev server is running..."
if ! curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "${YELLOW}Dev server not running. Starting it...${NC}"
    npm run dev &
    DEV_PID=$!
    echo "Waiting for dev server to start..."
    sleep 10
    SERVER_STARTED=true
else
    echo -e "${GREEN}Dev server is already running${NC}"
    SERVER_STARTED=false
fi

echo ""
echo "=================================="
echo "Running Test Suite"
echo "=================================="
echo ""

# Run Jest tests
echo -e "${YELLOW}Running unit and integration tests...${NC}"
npm test -- --verbose --coverage

TEST_EXIT_CODE=$?

echo ""
echo "=================================="
echo "Test Results Summary"
echo "=================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
fi

# Cleanup
if [ "$SERVER_STARTED" = true ]; then
    echo ""
    echo "Stopping dev server..."
    kill $DEV_PID
fi

exit $TEST_EXIT_CODE


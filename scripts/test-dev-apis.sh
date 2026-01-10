#!/bin/bash
# Test Script for Dev Database Migration
# Tests key API endpoints to verify the database consolidation works

set -e

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Testing Dev Database Migration - API Endpoints"
echo "=================================================="
echo ""

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -n "Testing: $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$endpoint")
    
    if [ "$response" -ge 200 ] && [ "$response" -lt 400 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response)"
        return 1
    fi
}

passed=0
failed=0

# Test public endpoints
test_endpoint "GET" "/" "Homepage" && ((passed++)) || ((failed++))
test_endpoint "GET" "/api/studios/search?query=london" "Studio search" && ((passed++)) || ((failed++))
test_endpoint "GET" "/sitemap.xml" "Sitemap generation" && ((passed++)) || ((failed++))

# Test API health
test_endpoint "GET" "/api/search/suggestions?q=test" "Search suggestions" && ((passed++)) || ((failed++))

echo ""
echo "=================================================="
echo "Test Results:"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi


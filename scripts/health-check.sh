#!/bin/bash

# Health Check Script for VoiceoverStudioFinder
# This script checks the health of the deployed application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default URL
URL="http://localhost:4000"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --url URL    Base URL to check (default: http://localhost:4000)"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "Checking health of VoiceoverStudioFinder at $URL"

# Function to check endpoint
check_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local description="$3"
    
    local full_url="${URL}${endpoint}"
    local status_code
    
    print_status "Checking $description..."
    
    if status_code=$(curl -s -o /dev/null -w "%{http_code}" "$full_url"); then
        if [ "$status_code" = "$expected_status" ]; then
            print_status "✅ $description: OK ($status_code)"
            return 0
        else
            print_error "❌ $description: Expected $expected_status, got $status_code"
            return 1
        fi
    else
        print_error "❌ $description: Failed to connect"
        return 1
    fi
}

# Function to check endpoint with JSON response
check_json_endpoint() {
    local endpoint="$1"
    local expected_field="$2"
    local description="$3"
    
    local full_url="${URL}${endpoint}"
    local response
    
    print_status "Checking $description..."
    
    if response=$(curl -s "$full_url"); then
        if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
            print_status "✅ $description: OK"
            return 0
        else
            print_error "❌ $description: Expected field '$expected_field' not found in response"
            return 1
        fi
    else
        print_error "❌ $description: Failed to connect"
        return 1
    fi
}

# Track overall health
OVERALL_HEALTH=0

# Check main application
check_endpoint "/" "200" "Main application" || OVERALL_HEALTH=1

# Check health endpoint
check_json_endpoint "/api/health" "status" "Health endpoint" || OVERALL_HEALTH=1

# Check admin interface (should redirect to login or dashboard)
check_endpoint "/admin" "200" "Admin interface" || OVERALL_HEALTH=1

# Check admin dashboard
check_endpoint "/admin/dashboard" "200" "Admin dashboard" || OVERALL_HEALTH=1

# Check API endpoints
check_endpoint "/api/admin/dashboard" "200" "Admin API dashboard" || OVERALL_HEALTH=1

# Check public API
check_endpoint "/api/studios/search" "200" "Public studios API" || OVERALL_HEALTH=1

# Check authentication
check_endpoint "/auth/signin" "200" "Authentication page" || OVERALL_HEALTH=1

# Summary
echo ""
if [ $OVERALL_HEALTH -eq 0 ]; then
    print_status "🎉 All health checks passed! Application is healthy."
    exit 0
else
    print_error "❌ Some health checks failed. Please check the application."
    exit 1
fi

#!/bin/bash

# Stop Stripe Development Environment
# This script stops the Stripe CLI listener and optionally cleans up log files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LISTENER_LOG="stripe-listener.log"
CLEAN_LOGS=false

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --clean)
      CLEAN_LOGS=true
      shift
      ;;
    --help)
      echo "Usage: bash scripts/stop-stripe-dev.sh [--clean]"
      echo ""
      echo "Options:"
      echo "  --clean    Also remove log files"
      echo "  --help     Show this help message"
      exit 0
      ;;
  esac
done

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header "🛑 Stopping Stripe Development Environment"

# Check for running Stripe listeners
if pgrep -f "stripe listen" > /dev/null; then
    print_info "Found running Stripe listener(s)"
    
    # Show PIDs
    PIDS=$(pgrep -f "stripe listen")
    for PID in $PIDS; do
        print_info "  PID: $PID"
    done
    
    # Stop the listeners
    print_info "Stopping Stripe listener(s)..."
    pkill -f "stripe listen"
    
    # Wait a moment to ensure they're stopped
    sleep 1
    
    # Verify they're stopped
    if pgrep -f "stripe listen" > /dev/null; then
        print_error "Failed to stop some listener(s). Trying force kill..."
        pkill -9 -f "stripe listen"
        sleep 1
    fi
    
    if ! pgrep -f "stripe listen" > /dev/null; then
        print_status "All Stripe listeners stopped"
    else
        print_error "Could not stop all listeners. You may need to manually kill them."
        exit 1
    fi
else
    print_info "No running Stripe listeners found"
fi

# Clean up log files if requested
if [ "$CLEAN_LOGS" = true ]; then
    print_header "🧹 Cleaning up log files"
    
    if [ -f "$LISTENER_LOG" ]; then
        rm -f "$LISTENER_LOG"
        print_status "Removed $LISTENER_LOG"
    else
        print_info "No log file to clean"
    fi
fi

print_header "✅ Cleanup Complete"
echo ""
echo "💡 Tips:"
echo "  • To restart Stripe setup: bash scripts/setup-stripe-dev.sh"
echo "  • To start with dev server: bash scripts/setup-stripe-dev.sh --start-dev"
echo ""


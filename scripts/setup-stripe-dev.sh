#!/bin/bash

# Stripe Development Setup Script for VoiceoverStudioFinder
# This script automates the Stripe CLI setup for local testing
# 
# Prerequisites:
# - Stripe CLI must be installed (https://stripe.com/docs/stripe-cli)
# - You must run 'stripe login' once before using this script
#
# Usage:
#   bash scripts/setup-stripe-dev.sh [--start-dev]
#
# Options:
#   --start-dev    Automatically start the Next.js dev server after setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PORT="${PORT:-3000}"
WEBHOOK_URL="localhost:${PORT}/api/stripe/webhook"
PRODUCT_NAME="Annual Membership"
PRODUCT_DESCRIPTION="Annual membership for VoiceoverStudioFinder platform"
PRICE_AMOUNT="2500"  # £25.00 in pence
PRICE_CURRENCY="gbp"
ENV_FILE=".env.local"
LISTENER_LOG="stripe-listener.log"
START_DEV=false

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --start-dev)
      START_DEV=true
      shift
      ;;
    --help)
      echo "Usage: bash scripts/setup-stripe-dev.sh [--start-dev]"
      echo ""
      echo "Options:"
      echo "  --start-dev    Automatically start the Next.js dev server after setup"
      echo "  --help         Show this help message"
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
    echo -e "${CYAN}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_header "🚀 Stripe Development Setup"

# Check if Stripe CLI is installed
print_info "Checking Stripe CLI installation..."
if ! command -v stripe &> /dev/null; then
    print_error "Stripe CLI is not installed."
    echo ""
    echo "Please install it from: https://stripe.com/docs/stripe-cli"
    echo ""
    echo "Installation commands:"
    echo "  macOS/Linux: brew install stripe/stripe-cli/stripe"
    echo "  Windows: scoop install stripe"
    echo "  Or download from: https://github.com/stripe/stripe-cli/releases"
    exit 1
fi

STRIPE_VERSION=$(stripe --version | head -n 1)
print_status "Stripe CLI installed: $STRIPE_VERSION"

# Check if user is logged in to Stripe
print_info "Checking Stripe authentication..."
if ! stripe config --list &> /dev/null; then
    print_error "You are not logged in to Stripe CLI."
    echo ""
    echo "Please run: stripe login"
    echo ""
    echo "This will open a browser window for authentication."
    exit 1
fi

print_status "Stripe CLI is authenticated"

# Create or backup .env.local
print_header "📝 Setting up environment file"

if [ ! -f "$ENV_FILE" ]; then
    print_info "Creating $ENV_FILE from env.example..."
    if [ -f "env.example" ]; then
        cp env.example "$ENV_FILE"
        print_status "Created $ENV_FILE"
    else
        print_warning "env.example not found, creating empty $ENV_FILE"
        touch "$ENV_FILE"
    fi
else
    print_info "$ENV_FILE already exists"
    # Create backup
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    print_status "Backup created: $BACKUP_FILE"
fi

# Stop any existing Stripe listeners
print_header "🛑 Stopping existing Stripe listeners"

# Cross-platform process detection (works on Windows Git Bash, macOS, Linux)
if ps aux 2>/dev/null | grep -q "[s]tripe listen"; then
    print_info "Stopping existing Stripe listener processes..."
    # Kill stripe listen processes (cross-platform)
    ps aux 2>/dev/null | grep "[s]tripe listen" | awk '{print $2}' | xargs kill 2>/dev/null || true
    sleep 2
    print_status "Existing listeners stopped"
else
    print_info "No existing listeners found"
fi

# Get Stripe API keys
print_header "🔑 Retrieving Stripe API keys"

# Function to extract value from .env.local
get_env_value() {
    local key=$1
    if [ -f "$ENV_FILE" ]; then
        grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'"
    fi
}

# Check if keys already exist in .env.local
EXISTING_SECRET_KEY=$(get_env_value "STRIPE_SECRET_KEY")
EXISTING_PUBLISHABLE_KEY=$(get_env_value "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")

if [ -n "$EXISTING_SECRET_KEY" ] && [[ "$EXISTING_SECRET_KEY" == sk_test_* ]]; then
    print_status "Found existing secret key in .env.local"
    STRIPE_SECRET_KEY="$EXISTING_SECRET_KEY"
else
    print_info "Checking Stripe account for API keys..."
    
    # Try to get keys from Stripe CLI (this often doesn't work due to security)
    STRIPE_SECRET_KEY=$(stripe config --list 2>/dev/null | grep -o "sk_test_[a-zA-Z0-9_]*" | head -n 1)
    
    if [ -z "$STRIPE_SECRET_KEY" ]; then
        print_warning "Could not automatically retrieve secret key."
        echo ""
        echo "📋 Please copy your test secret key from Stripe Dashboard:"
        echo "   https://dashboard.stripe.com/test/apikeys"
        echo ""
        echo "💡 Tip: You only need to enter this once - it will be saved to .env.local"
        echo ""
        read -p "Paste your test secret key (sk_test_...): " STRIPE_SECRET_KEY
        
        # Validate format
        if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_test_ ]]; then
            print_error "Invalid secret key format. Must start with 'sk_test_'"
            exit 1
        fi
    fi
fi

print_status "Secret key: ${STRIPE_SECRET_KEY:0:20}..."

if [ -n "$EXISTING_PUBLISHABLE_KEY" ] && [[ "$EXISTING_PUBLISHABLE_KEY" == pk_test_* ]]; then
    print_status "Found existing publishable key in .env.local"
    STRIPE_PUBLISHABLE_KEY="$EXISTING_PUBLISHABLE_KEY"
else
    print_info "Checking for publishable key..."
    
    # Try to get from Stripe CLI config
    STRIPE_PUBLISHABLE_KEY=$(stripe config --list 2>/dev/null | grep -o "pk_test_[a-zA-Z0-9_]*" | head -n 1)
    
    if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
        print_warning "Could not automatically retrieve publishable key."
        echo ""
        echo "📋 Please copy your test publishable key from:"
        echo "   https://dashboard.stripe.com/test/apikeys"
        echo ""
        read -p "Paste your test publishable key (pk_test_...): " STRIPE_PUBLISHABLE_KEY
        
        # Validate format
        if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_test_ ]]; then
            print_error "Invalid publishable key format. Must start with 'pk_test_'"
            exit 1
        fi
    fi
fi

print_status "Publishable key: ${STRIPE_PUBLISHABLE_KEY:0:20}..."

# Create product and price
print_header "💰 Creating Stripe product and price"

print_info "Checking for existing '$PRODUCT_NAME' product..."
EXISTING_PRODUCT_ID=$(stripe products list --limit 100 2>/dev/null | grep -B 2 "\"$PRODUCT_NAME\"" | grep "\"id\":" | head -n 1 | cut -d'"' -f4)

if [ -n "$EXISTING_PRODUCT_ID" ]; then
    print_warning "Product '$PRODUCT_NAME' already exists (ID: $EXISTING_PRODUCT_ID)"
    read -p "Do you want to create a new product? (y/N): " CREATE_NEW
    
    if [[ $CREATE_NEW =~ ^[Yy]$ ]]; then
        PRODUCT_NAME="${PRODUCT_NAME} ($(date +%Y%m%d_%H%M%S))"
        print_info "Creating new product with name: $PRODUCT_NAME"
        PRODUCT_ID=""
    else
        PRODUCT_ID=$EXISTING_PRODUCT_ID
        print_info "Using existing product"
    fi
else
    PRODUCT_ID=""
fi

if [ -z "$PRODUCT_ID" ]; then
    print_info "Creating product: $PRODUCT_NAME"
    PRODUCT_RESPONSE=$(stripe products create \
        --name="$PRODUCT_NAME" \
        --description="$PRODUCT_DESCRIPTION" \
        2>/dev/null)
    
    PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | grep -o '"id": "prod_[^"]*"' | head -n 1 | cut -d'"' -f4)
    
    if [ -z "$PRODUCT_ID" ]; then
        print_error "Failed to create product"
        exit 1
    fi
    
    print_status "Product created: $PRODUCT_ID"
fi

# Create price for the product
print_info "Creating price (£${PRICE_AMOUNT:0:-2}.${PRICE_AMOUNT: -2})..."
PRICE_RESPONSE=$(stripe prices create \
    --product="$PRODUCT_ID" \
    --unit-amount="$PRICE_AMOUNT" \
    --currency="$PRICE_CURRENCY" \
    2>/dev/null)

STRIPE_MEMBERSHIP_PRICE_ID=$(echo "$PRICE_RESPONSE" | grep -o '"id": "price_[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ -z "$STRIPE_MEMBERSHIP_PRICE_ID" ]; then
    print_error "Failed to create price"
    exit 1
fi

print_status "Price created: $STRIPE_MEMBERSHIP_PRICE_ID"

# Start Stripe listener in background
print_header "👂 Starting Stripe webhook listener"

print_info "Starting listener for: $WEBHOOK_URL"

# Clean up old log file
rm -f "$LISTENER_LOG"

# Start listener in background and capture output
stripe listen --forward-to "$WEBHOOK_URL" --print-secret > "$LISTENER_LOG" 2>&1 &
LISTENER_PID=$!

print_info "Listener started (PID: $LISTENER_PID)"
print_info "Waiting for webhook secret..."

# Wait for webhook secret to be generated
MAX_WAIT=10
WAIT_COUNT=0
STRIPE_WEBHOOK_SECRET=""

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if [ -f "$LISTENER_LOG" ]; then
        STRIPE_WEBHOOK_SECRET=$(grep -o "whsec_[a-zA-Z0-9]*" "$LISTENER_LOG" | head -n 1)
        
        if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
            break
        fi
    fi
    
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done

echo ""

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    print_error "Failed to retrieve webhook secret"
    print_info "Check the listener log: $LISTENER_LOG"
    exit 1
fi

print_status "Webhook secret retrieved: ${STRIPE_WEBHOOK_SECRET:0:20}..."

# Update .env.local file
print_header "📄 Updating $ENV_FILE"

# Function to update or append env variable
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Update existing line (macOS and Linux compatible)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=\"${value}\"|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$ENV_FILE"
        fi
        print_info "Updated $key"
    else
        # Append new line
        echo "${key}=\"${value}\"" >> "$ENV_FILE"
        print_info "Added $key"
    fi
}

update_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
update_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY"
update_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
update_env_var "STRIPE_MEMBERSHIP_PRICE_ID" "$STRIPE_MEMBERSHIP_PRICE_ID"

print_status "Environment variables updated"

# Summary
print_header "✅ Setup Complete!"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Stripe Configuration Summary${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Product Details:"
echo "  Product ID: $PRODUCT_ID"
echo "  Price ID:   $STRIPE_MEMBERSHIP_PRICE_ID"
echo "  Amount:     £${PRICE_AMOUNT:0:-2}.${PRICE_AMOUNT: -2} $PRICE_CURRENCY"
echo ""
echo "🔗 Webhook Listener:"
echo "  Status:     Running (PID: $LISTENER_PID)"
echo "  Forwarding: $WEBHOOK_URL"
echo "  Log file:   $LISTENER_LOG"
echo ""
echo "🔑 Environment Variables:"
echo "  All Stripe variables have been saved to $ENV_FILE"
echo ""
echo -e "${YELLOW}⚠ Important:${NC}"
echo "  • The webhook listener is running in the background"
echo "  • It will continue running even after this script finishes"
echo "  • To stop it later, run: pkill -f 'stripe listen'"
echo "  • To view listener activity: tail -f $LISTENER_LOG"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Optionally start dev server
if [ "$START_DEV" = true ]; then
    print_header "🚀 Starting development server"
    print_info "Starting Next.js on port $PORT..."
    echo ""
    npm run dev
else
    echo "🎯 Next Steps:"
    echo "  1. Start the development server: npm run dev"
    echo "  2. Visit http://localhost:$PORT"
    echo "  3. Test payments using Stripe test cards:"
    echo "     • Success: 4242 4242 4242 4242"
    echo "     • Decline: 4000 0000 0000 0002"
    echo ""
    echo "📚 Useful Links:"
    echo "  • Stripe Dashboard: https://dashboard.stripe.com/test"
    echo "  • Test Cards: https://stripe.com/docs/testing#cards"
    echo "  • Webhook Events: $LISTENER_LOG"
    echo ""
    echo "💡 Tip: Run this script with --start-dev to automatically start the dev server"
    echo ""
fi


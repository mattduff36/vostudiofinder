#!/bin/bash

# Full Development Environment Startup Script
# Starts all services needed for local development:
# - Stripe CLI listener
# - Docker services (optional)
# - Next.js dev server
#
# Usage:
#   bash scripts/dev-full.sh [--no-docker] [--no-stripe]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENABLE_DOCKER=true
ENABLE_STRIPE=true

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --no-docker)
      ENABLE_DOCKER=false
      shift
      ;;
    --no-stripe)
      ENABLE_STRIPE=false
      shift
      ;;
    --help)
      echo "Usage: bash scripts/dev-full.sh [--no-docker] [--no-stripe]"
      echo ""
      echo "Starts the complete development environment including:"
      echo "  • Stripe CLI listener (with webhook forwarding)"
      echo "  • Docker services (PostgreSQL, Redis, etc.)"
      echo "  • Next.js development server"
      echo ""
      echo "Options:"
      echo "  --no-docker    Skip Docker services startup"
      echo "  --no-stripe    Skip Stripe CLI setup"
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

print_header "🚀 Starting Full Development Environment"

# Check for .env.local
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found"
    print_info "Creating from env.example..."
    
    if [ -f "env.example" ]; then
        cp env.example .env.local
        print_status "Created .env.local"
        print_warning "Please update .env.local with your actual values before continuing"
        exit 0
    else
        print_error "env.example not found. Cannot create .env.local"
        exit 1
    fi
fi

# Start Docker services (optional)
if [ "$ENABLE_DOCKER" = true ]; then
    print_header "🐳 Starting Docker Services"
    
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            print_info "Starting Docker Compose services..."
            
            if [ -f "docker-compose.yml" ]; then
                npm run docker:up
                print_status "Docker services started"
                
                # Wait a moment for services to be ready
                print_info "Waiting for services to initialize..."
                sleep 3
            else
                print_warning "docker-compose.yml not found, skipping Docker"
            fi
        else
            print_warning "Docker daemon is not running, skipping Docker services"
        fi
    else
        print_warning "Docker not installed, skipping Docker services"
    fi
else
    print_info "Skipping Docker services (--no-docker)"
fi

# Setup Stripe (optional)
if [ "$ENABLE_STRIPE" = true ]; then
    print_header "💳 Setting up Stripe"
    
    if command -v stripe &> /dev/null; then
        # Check if already authenticated
        if stripe config --list &> /dev/null; then
            print_info "Running Stripe setup..."
            bash scripts/setup-stripe-dev.sh
            print_status "Stripe setup complete"
        else
            print_warning "Stripe CLI not authenticated"
            echo ""
            echo "Please run: stripe login"
            echo "Then restart this script."
            exit 1
        fi
    else
        print_warning "Stripe CLI not installed, skipping Stripe setup"
        echo ""
        echo "Install Stripe CLI:"
        echo "  macOS/Linux: brew install stripe/stripe-cli/stripe"
        echo "  Windows: scoop install stripe"
        echo ""
        echo "Then run: stripe login"
    fi
else
    print_info "Skipping Stripe setup (--no-stripe)"
fi

# Generate Prisma client
print_header "🗃️  Setting up Database"
print_info "Generating Prisma client..."
npm run db:generate
print_status "Prisma client generated"

# Start Next.js dev server
print_header "⚡ Starting Next.js Development Server"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Development Environment Ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Running Services:"
if [ "$ENABLE_DOCKER" = true ]; then
    echo "  ✓ Docker services (PostgreSQL, Redis, etc.)"
fi
if [ "$ENABLE_STRIPE" = true ]; then
    echo "  ✓ Stripe CLI listener (webhook forwarding)"
fi
echo "  ✓ Next.js dev server (starting...)"
echo ""
echo "🔗 Access Points:"
echo "  • Application: http://localhost:3000"
echo "  • Admin Panel: http://localhost:3000/admin"
echo "  • Prisma Studio: npm run db:studio (in another terminal)"
if [ "$ENABLE_DOCKER" = true ]; then
    echo "  • Docker Logs: npm run docker:logs (in another terminal)"
fi
if [ "$ENABLE_STRIPE" = true ]; then
    echo "  • Stripe Events: tail -f stripe-listener.log (in another terminal)"
fi
echo ""
echo "🛑 To stop everything:"
if [ "$ENABLE_STRIPE" = true ]; then
    echo "  • Stripe: npm run stripe:stop"
fi
if [ "$ENABLE_DOCKER" = true ]; then
    echo "  • Docker: npm run docker:down"
fi
echo "  • Dev Server: Ctrl+C"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start dev server (this will block until Ctrl+C)
npm run dev


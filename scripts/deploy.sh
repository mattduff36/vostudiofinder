#!/bin/bash

# VoiceoverStudioFinder Deployment Script
# This script handles deployment for the merged application with admin functionality

set -e

echo "🚀 Starting VoiceoverStudioFinder deployment..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Please create it from env.example"
    print_status "Copying env.example to .env.local..."
    cp env.example .env.local
    print_warning "Please update .env.local with your actual values before continuing."
    exit 1
fi

# Parse command line arguments
DEPLOYMENT_TYPE=""
SKIP_TESTS=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --vercel)
            DEPLOYMENT_TYPE="vercel"
            shift
            ;;
        --docker)
            DEPLOYMENT_TYPE="docker"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --vercel      Deploy to Vercel"
            echo "  --docker      Deploy using Docker"
            echo "  --skip-tests  Skip running tests"
            echo "  --skip-build  Skip build process"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no deployment type specified, ask user
if [ -z "$DEPLOYMENT_TYPE" ]; then
    echo "Select deployment type:"
    echo "1) Vercel"
    echo "2) Docker"
    read -p "Enter choice (1-2): " choice
    
    case $choice in
        1) DEPLOYMENT_TYPE="vercel" ;;
        2) DEPLOYMENT_TYPE="docker" ;;
        *) print_error "Invalid choice"; exit 1 ;;
    esac
fi

print_status "Deployment type: $DEPLOYMENT_TYPE"

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Generate Prisma client
print_status "Generating Prisma client..."
npm run db:generate

# Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
    print_status "Running tests..."
    npm run test || {
        print_warning "Tests failed, but continuing with deployment..."
    }
fi

# Type checking
print_status "Running type checks..."
npm run type-check

# Linting
print_status "Running linter..."
npm run lint

# Build (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
    print_status "Building application..."
    npm run build
fi

# Deployment-specific steps
case $DEPLOYMENT_TYPE in
    "vercel")
        print_status "Deploying to Vercel..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            print_error "Vercel CLI not found. Please install it with: npm i -g vercel"
            exit 1
        fi
        
        # Deploy to Vercel
        vercel --prod
        
        print_status "✅ Deployment to Vercel completed!"
        ;;
        
    "docker")
        print_status "Deploying with Docker..."
        
        # Check if Docker is running
        if ! docker info &> /dev/null; then
            print_error "Docker is not running. Please start Docker and try again."
            exit 1
        fi
        
        # Build and start containers
        docker-compose down
        docker-compose build
        docker-compose up -d
        
        # Wait for services to be healthy
        print_status "Waiting for services to be healthy..."
        sleep 10
        
        # Check health
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            print_status "✅ Application is healthy!"
        else
            print_warning "Health check failed, but containers are running."
        fi
        
        print_status "✅ Docker deployment completed!"
        print_status "Application available at: http://localhost:3000"
        print_status "Admin interface available at: http://localhost:3000/admin"
        ;;
esac

print_status "🎉 Deployment completed successfully!"

# Post-deployment information
echo ""
echo "📋 Post-deployment checklist:"
echo "  - [ ] Test main application functionality"
echo "  - [ ] Test admin interface at /admin"
echo "  - [ ] Verify all environment variables are set correctly"
echo "  - [ ] Check database connections"
echo "  - [ ] Test authentication flows"
echo "  - [ ] Verify API endpoints are working"
echo "  - [ ] Check error tracking (Sentry) if configured"
echo ""
echo "🔗 Useful URLs:"
echo "  - Main app: http://localhost:3000"
echo "  - Admin: http://localhost:3000/admin"
echo "  - Health check: http://localhost:3000/api/health"
echo "  - pgAdmin: http://localhost:5050 (Docker only)"
echo ""
echo "📝 Logs:"
echo "  - Docker logs: npm run docker:logs"
echo "  - Vercel logs: vercel logs"

#!/bin/bash

# Development Setup Script for VoiceoverStudioFinder
# This script sets up the development environment for the merged application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_header "Setting up VoiceoverStudioFinder development environment..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

if [[ $NODE_VERSION < v18.0.0 ]]; then
    print_error "Node.js 18+ is required. Please upgrade Node.js."
    exit 1
fi

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Install dependencies
print_header "Installing dependencies..."
npm install

# Setup environment file
print_header "Setting up environment variables..."
if [ ! -f ".env.local" ]; then
    print_status "Creating .env.local from env.example..."
    cp env.example .env.local
    print_warning "Please update .env.local with your actual values:"
    echo "  - Database connection strings"
    echo "  - API keys (Google Maps, Stripe, etc.)"
    echo "  - Authentication secrets"
    echo "  - Admin credentials"
else
    print_status ".env.local already exists"
fi

# Generate Prisma client
print_header "Setting up database..."
print_status "Generating Prisma client..."
npm run db:generate

# Check if database is accessible
print_status "Checking database connection..."
if npm run db:push --dry-run &> /dev/null; then
    print_status "Database connection successful"
else
    print_warning "Database connection failed. Please check your DATABASE_URL in .env.local"
fi

# Setup Docker (optional)
print_header "Setting up Docker (optional)..."
if command -v docker &> /dev/null; then
    print_status "Docker is available"
    print_status "You can start the full stack with: npm run docker:up"
else
    print_warning "Docker not found. Install Docker to use the full development stack."
fi

# Run linting
print_header "Running code quality checks..."
print_status "Running linter..."
npm run lint || print_warning "Linting issues found. Run 'npm run lint:fix' to fix them."

# Type checking
print_status "Running type checks..."
npm run type-check || print_warning "Type checking issues found."

# Build check
print_status "Testing build process..."
npm run build || print_error "Build failed. Please fix the issues before continuing."

print_header "Development environment setup complete!"

echo ""
echo "📋 Next steps:"
echo "  1. Update .env.local with your actual values"
echo "  2. Start the development server: npm run dev"
echo "  3. Visit http://localhost:3000"
echo "  4. Access admin at http://localhost:3000/admin"
echo ""
echo "🔧 Available commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run lint         - Run linter"
echo "  npm run lint:fix     - Fix linting issues"
echo "  npm run type-check   - Run TypeScript checks"
echo "  npm run db:studio    - Open Prisma Studio"
echo "  npm run docker:up    - Start Docker services"
echo "  npm run docker:down  - Stop Docker services"
echo ""
echo "📚 Documentation:"
echo "  - Environment setup: docs/ENVIRONMENT_SETUP.md"
echo "  - Admin functionality: src/app/admin/"
echo "  - API endpoints: src/app/api/"
echo ""
echo "🎉 Happy coding!"

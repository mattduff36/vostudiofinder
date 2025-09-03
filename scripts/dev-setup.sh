#!/bin/bash

# VoiceoverStudioFinder Development Setup Script

set -e

echo "🚀 Setting up VoiceoverStudioFinder development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env.local from example if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from env.example..."
    cp env.example .env.local
    echo "⚠️  Please update .env.local with your actual environment variables"
fi

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres; do
    sleep 2
done

# Run Prisma migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Seed the database (if seed script exists)
if [ -f "scripts/seed-database.ts" ]; then
    echo "🌱 Seeding database..."
    npx tsx scripts/seed-database.ts
fi

echo "✅ Development environment setup complete!"
echo ""
echo "🌐 Services available at:"
echo "  - Next.js app: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - pgAdmin: http://localhost:5050 (admin@vostudiofinder.com / admin)"
echo ""
echo "🚀 Run 'npm run dev' to start the development server"

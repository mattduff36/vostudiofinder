# Environment Variables Setup

This document outlines all the environment variables required for the VoiceoverStudioFinder application.

## Required Environment Variables

Copy `env.example` to `.env.local` and update the values:

```bash
cp env.example .env.local
```

### Database Configuration

```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

- **Development**: `postgresql://postgres:password@localhost:5432/vostudiofinder_dev`
- **Test**: `postgresql://postgres:password@localhost:5432/vostudiofinder_test`
- **Production**: Use your production database URL

### Authentication (NextAuth.js)

```env
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

- **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
- **NEXTAUTH_URL**: Your app's URL (production: https://yourdomain.com)

### External Services

#### Google Maps API
```env
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```
Required for studio location mapping and search functionality.

#### Stripe (Payment Processing)
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

#### Email Service (Resend)
```env
RESEND_API_KEY="re_..."
```

#### File Storage (Cloudinary)
```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

#### Error Tracking (Sentry)
```env
SENTRY_DSN="https://..."
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
SENTRY_AUTH_TOKEN="your-auth-token"
```

### Application Settings

```env
NODE_ENV="development"
```

## Environment-Specific Configurations

### Development (.env.local)
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/vostudiofinder_dev"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### Testing (.env.test)
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/vostudiofinder_test"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="test"
```

### Production (Vercel Environment Variables)
Set these in your Vercel dashboard or deployment platform:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
# ... all other production values
```

## Security Notes

1. **Never commit `.env.local` or any environment files** to version control
2. **Use strong, unique secrets** for production
3. **Rotate secrets regularly** in production
4. **Use different keys/secrets** for each environment
5. **Limit API key permissions** to only what's needed

## Setup Scripts

Run the development setup script to automatically configure your environment:

```bash
npm run setup
```

This script will:
- Copy `env.example` to `.env.local` if it doesn't exist
- Start Docker containers
- Run database migrations
- Seed the database (if applicable)

## Verification

To verify your environment is set up correctly:

```bash
# Check environment variables are loaded
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Test database connection
npm run db:studio
```

# Deployment Guide

This guide covers deploying VoiceoverStudioFinder to production using Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Database**: Set up a production PostgreSQL database (Railway, Render, or Supabase)
3. **Domain**: Optional custom domain
4. **External Services**: Production keys for all third-party services

## Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select "Next.js" framework preset

### 2. Configure Environment Variables

In your Vercel project settings, add these environment variables:

#### Required Variables
```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://yourdomain.com"

# External APIs
GOOGLE_MAPS_API_KEY="your-production-api-key"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
RESEND_API_KEY="re_..."

# File Storage
CLOUDINARY_CLOUD_NAME="your-production-cloud"
CLOUDINARY_API_KEY="your-production-api-key"
CLOUDINARY_API_SECRET="your-production-api-secret"

# Error Tracking
SENTRY_DSN="https://your-production-dsn@sentry.io/project"
NEXT_PUBLIC_SENTRY_DSN="https://your-production-dsn@sentry.io/project"
SENTRY_ORG="your-org"
SENTRY_PROJECT="your-project"
SENTRY_AUTH_TOKEN="your-auth-token"

# Application
NODE_ENV="production"
```

### 3. Database Setup

#### Option A: Railway
1. Create account at [railway.app](https://railway.app)
2. Create PostgreSQL service
3. Copy connection string to `DATABASE_URL`

#### Option B: Render
1. Create account at [render.com](https://render.com)
2. Create PostgreSQL database
3. Copy connection string to `DATABASE_URL`

#### Option C: Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from settings
3. Copy to `DATABASE_URL`

### 4. Run Database Migrations

After deployment, run migrations:

```bash
# Using Vercel CLI
npx vercel env pull .env.local
npx prisma migrate deploy

# Or via Vercel dashboard terminal
```

### 5. Custom Domain (Optional)

1. Go to project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update `NEXTAUTH_URL` to your custom domain

## Build Configuration

The project is configured with:

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Framework**: Next.js

## Environment-Specific Settings

### Development
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/vostudiofinder_dev"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### Staging
```env
DATABASE_URL="postgresql://user:pass@staging-db:5432/vostudiofinder_staging"
NEXTAUTH_URL="https://staging.yourdomain.com"
NODE_ENV="staging"
```

### Production
```env
DATABASE_URL="postgresql://user:pass@prod-db:5432/vostudiofinder_prod"
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

## Security Headers

The `vercel.json` file includes security headers:

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

## Performance Optimization

### Image Optimization
- Next.js Image component with Cloudinary
- WebP and AVIF format support
- Automatic responsive images

### Caching Strategy
- Static assets: 1 year cache
- API routes: No cache (dynamic)
- Pages: ISR with revalidation

### Database Optimization
- Connection pooling via Prisma
- Query optimization
- Database indexes

## Monitoring and Analytics

### Error Tracking
- Sentry for error monitoring
- Performance tracking
- User session replay

### Analytics
- Vercel Analytics (built-in)
- Custom events tracking
- Performance metrics

## Backup Strategy

### Database Backups
- Automated daily backups
- Point-in-time recovery
- Cross-region replication

### File Storage Backups
- Cloudinary automatic backups
- Media asset versioning

## Rollback Strategy

### Quick Rollback
1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Find previous working deployment
4. Click "Promote to Production"

### Database Rollback
1. Restore from backup
2. Run previous migration state
3. Update application if needed

## Health Checks

The application includes health check endpoints:

- `/api/health` - Application health
- `/api/health/db` - Database connectivity
- `/api/health/external` - External services

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify dependencies
   - Review build logs

2. **Database Connection**
   - Verify DATABASE_URL format
   - Check firewall settings
   - Ensure database is accessible

3. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches domain
   - Ensure OAuth apps are configured

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Database connection working
- [ ] Authentication flows work
- [ ] External API integrations work
- [ ] Error tracking is active
- [ ] SSL certificate is valid
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented

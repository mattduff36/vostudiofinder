# Production Deployment Guide

This guide covers deploying VoiceoverStudioFinder to production with all required services and configurations.

## Prerequisites

- Vercel account for hosting
- PostgreSQL database (Railway, Supabase, or similar)
- Domain name with DNS access
- Google Maps API key
- Stripe account for payments
- Resend account for emails
- Sentry account for error tracking

## 1. Database Setup

### PostgreSQL Database

1. Create a PostgreSQL database on your preferred provider:
   - **Railway**: Simple, affordable option
   - **Supabase**: Includes additional features
   - **Neon**: Serverless PostgreSQL
   - **PlanetScale**: MySQL alternative

2. Get your database connection URL:
   ```
   postgresql://username:password@host:port/database
   ```

3. Run database migrations:
   ```bash
   npm run db:push
   ```

## 2. Environment Variables

Create production environment variables in Vercel dashboard:

### Core Application
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-super-secure-random-string"
NEXTAUTH_URL="https://yourdomain.com"
```

### OAuth Providers
```env
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
TWITTER_CLIENT_ID="your-twitter-api-key"
TWITTER_CLIENT_SECRET="your-twitter-api-secret"
```

### Google Maps
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### Stripe Payments
```env
STRIPE_SECRET_KEY="sk_live_your-live-stripe-secret-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your-live-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
```

### Email Service (Resend)
```env
RESEND_API_KEY="re_your-resend-api-key"
```

### Image Storage (Cloudinary)
```env
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

### Error Tracking (Sentry)
```env
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

## 3. Service Configuration

### Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Create API key and restrict to your domain
5. Add API key to environment variables

### Stripe Setup

1. Create Stripe account
2. Get API keys from dashboard
3. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Configure webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app
3. Add Facebook Login product
4. Add redirect URI: `https://yourdomain.com/api/auth/callback/facebook`

#### Twitter OAuth
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create new app
3. Enable OAuth 2.0
4. Add callback URL: `https://yourdomain.com/api/auth/callback/twitter`

## 4. Vercel Deployment

### Initial Deployment

1. Connect repository to Vercel
2. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

3. Add all environment variables in Vercel dashboard

4. Deploy and test

### Domain Configuration

1. Add custom domain in Vercel dashboard
2. Configure DNS records:
   ```
   CNAME: www.yourdomain.com -> cname.vercel-dns.com
   A: yourdomain.com -> 76.76.19.61
   ```

3. Update `NEXTAUTH_URL` environment variable

## 5. Data Migration

### From Legacy MySQL Database

1. Set up legacy database connection:
   ```env
   LEGACY_DB_HOST="your-legacy-host"
   LEGACY_DB_USER="your-legacy-user"
   LEGACY_DB_PASSWORD="your-legacy-password"
   LEGACY_DB_NAME="cl59-theshows2"
   ```

2. Validate legacy database:
   ```bash
   npm run migrate:validate
   ```

3. Run migration:
   ```bash
   npm run migrate:legacy
   ```

### SEO Preservation

Create 301 redirects in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/old-studio-path/:id",
      "destination": "/studio/:id",
      "permanent": true
    }
  ]
}
```

## 6. Monitoring & Analytics

### Error Tracking (Sentry)

1. Create Sentry project
2. Add DSN to environment variables
3. Configure alerts and notifications

### Performance Monitoring

Monitor these key metrics:
- Page load times
- API response times
- Database query performance
- Error rates
- User engagement

### Health Checks

Set up monitoring for:
- `/api/health` endpoint
- Database connectivity
- External service availability

## 7. Security Configuration

### SSL/TLS
- Vercel provides automatic HTTPS
- Ensure all external URLs use HTTPS

### Headers
Security headers are configured in `next.config.ts`:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options

### Rate Limiting
Implement rate limiting for:
- Authentication endpoints
- API routes
- Contact forms

## 8. Backup Strategy

### Database Backups
- Set up automated daily backups
- Test restore procedures
- Store backups in multiple locations

### File Storage Backups
- Backup user-uploaded images
- Document backup and restore procedures

## 9. Post-Deployment Checklist

### Functional Testing
- [ ] User registration and login
- [ ] Studio creation and editing
- [ ] Search functionality
- [ ] Payment processing
- [ ] Email notifications
- [ ] Map functionality
- [ ] Image uploads
- [ ] Review system

### Performance Testing
- [ ] Page load speeds < 3 seconds
- [ ] API response times < 500ms
- [ ] Mobile responsiveness
- [ ] SEO optimization

### Security Testing
- [ ] HTTPS enforcement
- [ ] Authentication flows
- [ ] Authorization checks
- [ ] Input validation
- [ ] SQL injection protection

## 10. Maintenance

### Regular Tasks
- Monitor error logs
- Update dependencies
- Review performance metrics
- Backup verification
- Security updates

### Scaling Considerations
- Database connection pooling
- CDN for static assets
- Caching strategies
- Load balancing (if needed)

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Review Sentry error reports
3. Validate environment variables
4. Test database connectivity

## Emergency Procedures

### Rollback Process
1. Revert to previous Vercel deployment
2. Restore database from backup if needed
3. Update DNS if domain changes required

### Incident Response
1. Identify and isolate the issue
2. Communicate with users via status page
3. Apply temporary fixes
4. Implement permanent solution
5. Post-incident review

---

**Deployment Status**: Ready for Production 🚀

This guide ensures a smooth deployment process with all necessary configurations and monitoring in place.

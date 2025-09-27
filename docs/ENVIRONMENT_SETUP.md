# Environment Setup Guide

This document provides comprehensive instructions for setting up environment variables for the merged VoiceoverStudioFinder application, which now includes both the main application and admin functionality from the old site.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Update the required variables in `.env.local` with your actual values
3. Restart your development server

## Environment Variables Reference

### Database Configuration

#### Primary Database (PostgreSQL)
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/vostudiofinder_dev"
```
- **Required**: Yes
- **Description**: Primary database connection string for PostgreSQL
- **Format**: `postgresql://username:password@host:port/database`

#### Turso Database (Alternative/Production)
```env
TURSO_DATABASE_URL="your-turso-database-url-here"
TURSO_AUTH_TOKEN="your-turso-auth-token-here"
```
- **Required**: No (alternative to PostgreSQL)
- **Description**: Turso SQLite database for production deployment
- **Usage**: Used when `DATABASE_URL` is not available

### Authentication

#### NextAuth.js Configuration
```env
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```
- **Required**: Yes
- **Description**: NextAuth.js configuration for OAuth providers
- **Security**: Use a strong, random secret in production

#### Admin Authentication (Legacy)
```env
AUTH_USERNAME="admin"
AUTH_PASSWORD="your-secure-password-here"
JWT_SECRET="your-jwt-secret-key-here"
```
- **Required**: Yes (for admin functionality)
- **Description**: Legacy admin authentication from old site
- **Security**: Use strong passwords and secrets

### OAuth Providers

#### Google OAuth
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```
- **Required**: No (optional OAuth provider)
- **Setup**: Configure in Google Cloud Console

#### Facebook OAuth
```env
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
```
- **Required**: No (optional OAuth provider)
- **Setup**: Configure in Facebook Developer Console

#### Twitter OAuth
```env
TWITTER_CLIENT_ID="your-twitter-client-id"
TWITTER_CLIENT_SECRET="your-twitter-client-secret"
```
- **Required**: No (optional OAuth provider)
- **Setup**: Configure in Twitter Developer Portal

### External APIs

#### Google Maps
```env
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```
- **Required**: Yes (for location features)
- **Description**: Google Maps API for location services
- **Setup**: Enable Maps JavaScript API and Places API

### Payment Processing

#### Stripe
```env
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
NEXT_PUBLIC_STRIPE_PRICE_ID="price_your-stripe-price-id"
STRIPE_MEMBERSHIP_PRICE_ID="price_your-membership-price-id"
NEXT_PUBLIC_STRIPE_MEMBERSHIP_PRICE_ID="price_your-membership-price-id"
```
- **Required**: No (for payment features)
- **Description**: Stripe payment processing configuration
- **Setup**: Create products and prices in Stripe Dashboard

#### PayPal (Alternative)
```env
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-client-secret"
PAYPAL_ENVIRONMENT="sandbox"
PAYPAL_PLAN_ID="P-your-paypal-plan-id"
```
- **Required**: No (alternative payment provider)
- **Description**: PayPal payment processing
- **Environment**: Use "sandbox" for testing, "live" for production

### Email Service

#### Resend
```env
RESEND_API_KEY="re_your-resend-api-key"
```
- **Required**: No (for email features)
- **Description**: Resend email service for transactional emails
- **Setup**: Create account at resend.com

### File Upload

#### Cloudinary
```env
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```
- **Required**: No (for image upload features)
- **Description**: Cloudinary for image storage and processing
- **Setup**: Create account at cloudinary.com

### Error Tracking

#### Sentry
```env
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```
- **Required**: No (for error monitoring)
- **Description**: Sentry for error tracking and monitoring
- **Setup**: Create project at sentry.io

### Caching

#### Redis
```env
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
CACHE_PREFIX="vsf"
```
- **Required**: No (for performance optimization)
- **Description**: Redis for caching and session storage
- **Setup**: Install Redis server locally or use cloud service

### Legacy Database (Migration)

#### Legacy MySQL Database
```env
LEGACY_DB_HOST="localhost"
LEGACY_DB_USER="root"
LEGACY_DB_PASSWORD="your-legacy-db-password"
LEGACY_DB_NAME="cl59-theshows2"
```
- **Required**: No (for data migration only)
- **Description**: Legacy MySQL database from old site
- **Usage**: Used during migration process only

### Development

#### Node Environment
```env
NODE_ENV="development"
```
- **Required**: Yes
- **Values**: `development`, `production`, `test`
- **Description**: Node.js environment mode

## Environment-Specific Configurations

### Development
- Use local PostgreSQL database
- Set `NODE_ENV=development`
- Use test API keys and sandbox payment providers
- Enable debug logging

### Production
- Use production database (PostgreSQL or Turso)
- Set `NODE_ENV=production`
- Use live API keys and production payment providers
- Enable error tracking and monitoring
- Use strong secrets and passwords

### Testing
- Use test database
- Set `NODE_ENV=test`
- Use mock services where possible
- Disable external API calls

## Security Best Practices

### Required Variables
These variables must be set for the application to function:
- `DATABASE_URL` or `TURSO_DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `JWT_SECRET`

### Sensitive Variables
These variables contain sensitive information and should be kept secure:
- All database connection strings
- All API keys and secrets
- All authentication credentials
- All payment processing keys

### Public Variables
These variables are safe to expose to the client:
- `NEXT_PUBLIC_*` variables (by design)
- `NODE_ENV` (non-sensitive)

## Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify `DATABASE_URL` format
- Check database server is running
- Ensure database exists and is accessible

#### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set and strong
- Check `NEXTAUTH_URL` matches your domain
- Ensure admin credentials are correct

#### API Key Issues
- Verify API keys are valid and active
- Check API quotas and limits
- Ensure required APIs are enabled

#### Build Errors
- Check all required environment variables are set
- Verify variable names match exactly
- Check for typos in variable values

### Validation Script
Run this script to validate your environment setup:
```bash
node scripts/validate-environment.js
```

## Migration from Old Site

If migrating from the old `vosf-old-site`, ensure these variables are properly migrated:

### Old Site Variables → New Site Variables
- `TURSO_DATABASE_URL` → `TURSO_DATABASE_URL` (same)
- `TURSO_AUTH_TOKEN` → `TURSO_AUTH_TOKEN` (same)
- `AUTH_USERNAME` → `AUTH_USERNAME` (same)
- `AUTH_PASSWORD` → `AUTH_PASSWORD` (same)
- `CLOUDINARY_*` → `CLOUDINARY_*` (same)

### New Variables to Add
- `DATABASE_URL` (PostgreSQL)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `JWT_SECRET`
- OAuth provider credentials
- Payment processing keys
- Email service keys

## Support

For environment setup issues:
1. Check this documentation
2. Verify all required variables are set
3. Test with the validation script
4. Check application logs for specific errors
5. Contact the development team if issues persist

# DNS and Routing Configuration

This document outlines the DNS and routing configuration for the merged VoiceoverStudioFinder application, including the admin functionality.

## Overview

The merged application serves both the main public site and admin functionality from the same domain. The admin interface is accessible at `/admin/*` routes rather than a separate subdomain.

## Current Configuration

### Main Application
- **Domain**: `vostudiofinder.mpdee.co.uk`
- **Admin Routes**: `vostudiofinder.mpdee.co.uk/admin/*`
- **API Routes**: `vostudiofinder.mpdee.co.uk/api/*`

### Legacy Admin Site (to be deprecated)
- **Domain**: `vosf-old-data.mpdee.co.uk`
- **Status**: Will be redirected to new admin routes

## DNS Configuration

### Primary Domain (vostudiofinder.mpdee.co.uk)

#### A Records
```
vostudiofinder.mpdee.co.uk    A    [Vercel IP]
```

#### CNAME Records
```
www.vostudiofinder.mpdee.co.uk    CNAME    vostudiofinder.mpdee.co.uk
```

#### MX Records (if email is needed)
```
vostudiofinder.mpdee.co.uk    MX    10    mail.vostudiofinder.mpdee.co.uk
```

### Legacy Domain (vosf-old-data.mpdee.co.uk)

#### Redirect Configuration
```
vosf-old-data.mpdee.co.uk    CNAME    vostudiofinder.mpdee.co.uk
```

## Vercel Configuration

### Domain Settings
1. **Primary Domain**: `vostudiofinder.mpdee.co.uk`
2. **Redirects**: Configure redirects from legacy admin domain

### Environment Variables
Set the following environment variables in Vercel:

```env
NEXTAUTH_URL=https://vostudiofinder.mpdee.co.uk
NEXT_PUBLIC_APP_URL=https://vostudiofinder.mpdee.co.uk
```

### Redirect Rules
Configure the following redirects in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/admin",
      "destination": "/admin/dashboard",
      "permanent": false
    }
  ]
}
```

## Routing Configuration

### Admin Route Protection
Admin routes are protected by middleware in `src/middleware.ts`:

```typescript
// Admin routes require ADMIN role
if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
  return NextResponse.redirect(new URL('/unauthorized', req.url));
}
```

### API Route Protection
Admin API routes are protected:

```typescript
// Admin API routes require ADMIN role
if (pathname.startsWith('/api/admin') && userRole !== 'ADMIN') {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}
```

## Migration from Legacy Admin Site

### URL Mapping
| Legacy URL | New URL |
|------------|---------|
| `vosf-old-data.mpdee.co.uk/dashboard` | `vostudiofinder.mpdee.co.uk/admin/dashboard` |
| `vosf-old-data.mpdee.co.uk/studios` | `vostudiofinder.mpdee.co.uk/admin/studios` |
| `vosf-old-data.mpdee.co.uk/analytics` | `vostudiofinder.mpdee.co.uk/admin/analytics` |
| `vosf-old-data.mpdee.co.uk/network` | `vostudiofinder.mpdee.co.uk/admin/network` |
| `vosf-old-data.mpdee.co.uk/query` | `vostudiofinder.mpdee.co.uk/admin/query` |
| `vosf-old-data.mpdee.co.uk/schema` | `vostudiofinder.mpdee.co.uk/admin/schema` |
| `vosf-old-data.mpdee.co.uk/venues` | `vostudiofinder.mpdee.co.uk/admin/venues` |
| `vosf-old-data.mpdee.co.uk/faq` | `vostudiofinder.mpdee.co.uk/admin/faq` |
| `vosf-old-data.mpdee.co.uk/browse` | `vostudiofinder.mpdee.co.uk/admin/browse` |

### Redirect Implementation
Add redirects in `vercel.json` to handle legacy URLs:

```json
{
  "redirects": [
    {
      "source": "/dashboard",
      "destination": "/admin/dashboard",
      "permanent": true
    },
    {
      "source": "/studios",
      "destination": "/admin/studios",
      "permanent": true
    },
    {
      "source": "/analytics",
      "destination": "/admin/analytics",
      "permanent": true
    },
    {
      "source": "/network",
      "destination": "/admin/network",
      "permanent": true
    },
    {
      "source": "/query",
      "destination": "/admin/query",
      "permanent": true
    },
    {
      "source": "/schema",
      "destination": "/admin/schema",
      "permanent": true
    },
    {
      "source": "/venues",
      "destination": "/admin/venues",
      "permanent": true
    },
    {
      "source": "/faq",
      "destination": "/admin/faq",
      "permanent": true
    },
    {
      "source": "/browse",
      "destination": "/admin/browse",
      "permanent": true
    }
  ]
}
```

## SSL/TLS Configuration

### Automatic SSL
Vercel automatically provides SSL certificates for custom domains. Ensure:

1. Domain is properly configured in Vercel
2. DNS records point to Vercel
3. SSL certificate is automatically issued

### Security Headers
Configure security headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/admin/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

## Monitoring and Analytics

### Domain Monitoring
Set up monitoring for:
- `vostudiofinder.mpdee.co.uk` (main domain)
- `vostudiofinder.mpdee.co.uk/admin/*` (admin routes)
- `vostudiofinder.mpdee.co.uk/api/*` (API routes)

### Analytics
Configure analytics to track:
- Public site usage
- Admin interface usage
- API endpoint performance
- Error rates and performance metrics

## Deployment Checklist

### Pre-Deployment
- [ ] DNS records configured
- [ ] Domain added to Vercel
- [ ] SSL certificate issued
- [ ] Environment variables set
- [ ] Redirect rules configured

### Post-Deployment
- [ ] Test main domain accessibility
- [ ] Test admin routes
- [ ] Test legacy URL redirects
- [ ] Verify SSL certificate
- [ ] Check security headers
- [ ] Monitor error rates

### Legacy Site Decommission
- [ ] Notify users of URL changes
- [ ] Update bookmarks and documentation
- [ ] Monitor redirect traffic
- [ ] Plan legacy domain decommission

## Troubleshooting

### Common Issues

#### DNS Propagation
- DNS changes can take up to 48 hours to propagate
- Use `dig` or `nslookup` to check DNS resolution
- Clear DNS cache if needed

#### SSL Certificate Issues
- Ensure domain is properly configured in Vercel
- Check DNS records point to Vercel
- Wait for automatic certificate issuance

#### Redirect Issues
- Check `vercel.json` configuration
- Verify redirect rules are correct
- Test redirects in browser

#### Admin Access Issues
- Verify user has ADMIN role
- Check authentication middleware
- Verify environment variables

### Support Commands

```bash
# Check DNS resolution
dig vostudiofinder.mpdee.co.uk

# Check SSL certificate
openssl s_client -connect vostudiofinder.mpdee.co.uk:443 -servername vostudiofinder.mpdee.co.uk

# Test redirects
curl -I https://vostudiofinder.mpdee.co.uk/admin

# Check health
curl https://vostudiofinder.mpdee.co.uk/api/health
```

## Security Considerations

### Domain Security
- Use HTTPS for all traffic
- Implement security headers
- Monitor for suspicious activity
- Regular security audits

### Admin Access
- Strong authentication required
- Role-based access control
- Audit logging
- Session management

### API Security
- Rate limiting
- Input validation
- Authentication required
- Error handling

## Maintenance

### Regular Tasks
- Monitor domain expiration
- Update SSL certificates
- Review security headers
- Check redirect performance
- Monitor error rates

### Updates
- Keep DNS records updated
- Monitor Vercel configuration
- Update redirect rules as needed
- Review security policies

This configuration ensures a smooth transition from the legacy admin site to the unified application while maintaining security and performance.

# Monitoring and Logging Configuration

This document outlines the monitoring and logging setup for the merged VoiceoverStudioFinder application, including admin functionality.

## Overview

The application uses multiple monitoring and logging solutions to ensure reliability, performance, and security:

- **Sentry**: Error tracking and performance monitoring
- **Vercel Analytics**: Built-in analytics and performance metrics
- **Custom Logging**: Application-specific logging for admin operations
- **Health Checks**: System health monitoring
- **Database Monitoring**: Database performance and connection monitoring

## Sentry Configuration

### Setup
Sentry is already configured in the application with the following files:
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking

### Environment Variables
```env
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_ORG="your-sentry-org"
SENTRY_PROJECT="your-sentry-project"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
```

### Features
- **Error Tracking**: Automatic error capture and reporting
- **Performance Monitoring**: API route performance tracking
- **Release Tracking**: Deployment and release monitoring
- **User Context**: User information in error reports
- **Custom Tags**: Admin vs public user tagging

### Admin-Specific Monitoring
```typescript
// Example: Tag admin operations
Sentry.setTag('user_type', 'admin');
Sentry.setTag('admin_operation', 'studio_management');
```

## Vercel Analytics

### Built-in Features
- **Page Views**: Track page visits and user behavior
- **Performance Metrics**: Core Web Vitals and performance data
- **Geographic Data**: User location and distribution
- **Device Information**: Browser and device analytics

### Configuration
Analytics is automatically enabled in production. No additional configuration needed.

## Custom Logging

### Admin Operation Logging
Create a custom logger for admin operations:

```typescript
// src/lib/admin-logger.ts
import { db } from '@/lib/db';

interface AdminLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAdminAction(entry: AdminLogEntry) {
  try {
    await db.adminLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
```

### Database Schema for Admin Logs
Add to `prisma/schema.prisma`:

```prisma
model AdminLog {
  id          String   @id @default(cuid())
  userId      String
  action      String
  resource    String
  resourceId  String?
  details     Json?
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@map("admin_logs")
}
```

## Health Monitoring

### Health Check Endpoint
The application includes a health check endpoint at `/api/health`:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
          api: 'operational'
        },
        error: 'Database connection failed'
      },
      { status: 503 }
    );
  }
}
```

### Extended Health Check
Create an extended health check for admin monitoring:

```typescript
// src/app/api/admin/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    // Check Redis connection (if used)
    const redisStatus = await checkRedisConnection();
    
    // Check external services
    const externalServices = await checkExternalServices();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus,
        external: externalServices,
        api: 'operational'
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 503 }
    );
  }
}
```

## Performance Monitoring

### API Route Performance
Monitor API route performance with custom middleware:

```typescript
// src/lib/performance-monitor.ts
export function withPerformanceMonitoring(handler: any) {
  return async (req: Request, res: Response) => {
    const start = Date.now();
    
    try {
      const result = await handler(req, res);
      const duration = Date.now() - start;
      
      // Log performance metrics
      console.log(`API ${req.url} completed in ${duration}ms`);
      
      // Send to monitoring service
      if (duration > 1000) {
        Sentry.addBreadcrumb({
          message: 'Slow API response',
          category: 'performance',
          data: {
            url: req.url,
            duration,
            method: req.method
          }
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`API ${req.url} failed after ${duration}ms:`, error);
      throw error;
    }
  };
}
```

### Database Query Monitoring
Monitor database query performance:

```typescript
// src/lib/db-monitor.ts
export function withQueryMonitoring<T>(
  query: () => Promise<T>,
  queryName: string
): Promise<T> {
  const start = Date.now();
  
  return query().then(
    (result) => {
      const duration = Date.now() - start;
      console.log(`Query ${queryName} completed in ${duration}ms`);
      
      if (duration > 500) {
        Sentry.addBreadcrumb({
          message: 'Slow database query',
          category: 'database',
          data: {
            query: queryName,
            duration
          }
        });
      }
      
      return result;
    },
    (error) => {
      const duration = Date.now() - start;
      console.error(`Query ${queryName} failed after ${duration}ms:`, error);
      throw error;
    }
  );
}
```

## Security Monitoring

### Admin Access Monitoring
Monitor admin access and operations:

```typescript
// src/lib/security-monitor.ts
export function monitorAdminAccess(req: Request, user: any, action: string) {
  const logEntry = {
    userId: user.id,
    action,
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    userAgent: req.headers.get('user-agent'),
    timestamp: new Date(),
    url: req.url,
    method: req.method
  };
  
  // Log to database
  logAdminAction(logEntry);
  
  // Send to Sentry for security monitoring
  Sentry.addBreadcrumb({
    message: 'Admin access',
    category: 'security',
    data: logEntry
  });
  
  // Check for suspicious activity
  if (isSuspiciousActivity(logEntry)) {
    Sentry.captureMessage('Suspicious admin activity detected', 'warning');
  }
}
```

### Failed Authentication Monitoring
Monitor failed authentication attempts:

```typescript
// src/lib/auth-monitor.ts
export function monitorFailedAuth(req: Request, reason: string) {
  const logEntry = {
    reason,
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    userAgent: req.headers.get('user-agent'),
    timestamp: new Date(),
    url: req.url
  };
  
  // Log failed attempt
  console.warn('Failed authentication attempt:', logEntry);
  
  // Send to Sentry
  Sentry.addBreadcrumb({
    message: 'Failed authentication',
    category: 'security',
    data: logEntry
  });
}
```

## Alerting and Notifications

### Error Alerts
Configure Sentry alerts for:
- High error rates
- Critical errors
- Performance degradation
- Security incidents

### Custom Alerts
Create custom alerting for admin operations:

```typescript
// src/lib/alerting.ts
export async function sendAlert(
  type: 'error' | 'warning' | 'info',
  message: string,
  data?: any
) {
  // Send to monitoring service
  console.log(`[${type.toUpperCase()}] ${message}`, data);
  
  // Send to Sentry for critical issues
  if (type === 'error') {
    Sentry.captureMessage(message, 'error');
  }
  
  // Send email notification for critical issues
  if (type === 'error' && process.env.NODE_ENV === 'production') {
    await sendEmailAlert(message, data);
  }
}
```

## Log Aggregation

### Structured Logging
Use structured logging for better analysis:

```typescript
// src/lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  data?: any;
}

export function log(entry: LogEntry) {
  const logLine = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
    service: 'vostudiofinder',
    version: process.env.npm_package_version
  });
  
  console.log(logLine);
}
```

### Log Levels
- **ERROR**: System errors, failed operations
- **WARN**: Warnings, deprecated usage, performance issues
- **INFO**: General information, user actions, system events
- **DEBUG**: Detailed debugging information

## Monitoring Dashboard

### Admin Dashboard Metrics
Add monitoring metrics to the admin dashboard:

```typescript
// src/app/admin/dashboard/page.tsx
export default async function AdminDashboard() {
  const metrics = await getSystemMetrics();
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="System Health"
          value={metrics.health}
          status={metrics.health === 'healthy' ? 'success' : 'error'}
        />
        
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers}
          status="info"
        />
        
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate}%`}
          status={metrics.errorRate > 5 ? 'error' : 'success'}
        />
      </div>
      
      <SystemMetrics metrics={metrics} />
    </div>
  );
}
```

## Maintenance and Cleanup

### Log Rotation
Implement log rotation for database logs:

```sql
-- Clean up old admin logs (older than 90 days)
DELETE FROM admin_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Performance Optimization
- Index frequently queried log fields
- Archive old logs to cold storage
- Monitor log table size and performance

## Troubleshooting

### Common Issues

#### High Error Rates
- Check Sentry for error patterns
- Review recent deployments
- Check external service status
- Monitor database performance

#### Performance Issues
- Check API response times
- Monitor database query performance
- Review memory and CPU usage
- Check for memory leaks

#### Security Incidents
- Review admin access logs
- Check for suspicious patterns
- Monitor failed authentication attempts
- Review user permissions

### Monitoring Commands

```bash
# Check application health
curl https://vostudiofinder.mpdee.co.uk/api/health

# Check admin health
curl https://vostudiofinder.mpdee.co.uk/api/admin/health

# View recent logs
docker-compose logs -f app

# Check database performance
npm run db:studio
```

This monitoring and logging setup provides comprehensive visibility into the application's health, performance, and security, ensuring reliable operation of both the public site and admin functionality.

import * as Sentry from '@sentry/nextjs';

/**
 * Utility functions for error tracking with Sentry
 */

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      additional: context,
    },
  });
}

/**
 * Capture a message with level
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, level);
  
  if (context) {
    Sentry.setContext('additional', context);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  Sentry.setUser(user);
}

/**
 * Set additional tags for filtering
 */
export function setTags(tags: Record<string, string>) {
  Sentry.setTags(tags);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data: data || {},
    timestamp: Date.now() / 1000,
  });
}

/**
 * Create a performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, () => {
    // Transaction started
  });
}

/**
 * Wrapper for database operations with error tracking
 */
export async function withErrorTracking<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  const transaction = startTransaction(operationName, 'db.query');
  
  try {
    addBreadcrumb(`Starting ${operationName}`, 'database', 'info', context);
    const result = await operation();
    addBreadcrumb(`Completed ${operationName}`, 'database', 'info');
    return result;
  } catch (error) {
    addBreadcrumb(`Failed ${operationName}`, 'database', 'error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ...context,
    });
    
    if (error instanceof Error) {
      captureException(error, {
        operation: operationName,
        ...context,
      });
    }
    
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * API route error handler
 */
export function handleApiError(error: unknown, req: any) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
  
  captureException(error instanceof Error ? error : new Error(errorMessage), {
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  
  return {
    error: errorMessage,
    timestamp: new Date().toISOString(),
  };
}

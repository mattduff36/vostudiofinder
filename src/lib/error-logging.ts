/**
 * Error Logging Utilities
 * 
 * Simple console-based error logging (Sentry removed)
 * All functions maintain the same API for backward compatibility
 */

/**
 * Log an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>) {
  console.error('[Error]', error.message, context || {});
  if (error.stack) {
    console.error(error.stack);
  }
}

/**
 * Log a message with level
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  const levelMap = {
    fatal: console.error,
    error: console.error,
    warning: console.warn,
    log: console.log,
    info: console.info,
    debug: console.debug,
  };
  
  levelMap[level](`[${level.toUpperCase()}]`, message, context || {});
}

/**
 * Set user context for error tracking (no-op, kept for compatibility)
 */
export function setUserContext(_user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  // No-op: User context logging removed with Sentry
}

/**
 * Set additional tags for filtering (no-op, kept for compatibility)
 */
export function setTags(_tags: Record<string, string>) {
  // No-op: Tag tracking removed with Sentry
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  _level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  console.debug(`[Breadcrumb][${category}]`, message, data || {});
}

/**
 * Create a performance transaction (no-op, kept for compatibility)
 */
export function startTransaction(_name: string, _op: string) {
  // No-op: Performance tracking removed with Sentry
  return null;
}

/**
 * Wrapper for database operations with error tracking
 */
export async function withErrorTracking<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
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
  }
}

/**
 * API route error handler
 */
export function handleApiError(error: unknown, context?: string | any) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
  const errorContext = typeof context === 'string' ? { context } : context;
  
  captureException(
    error instanceof Error ? error : new Error(errorMessage),
    errorContext
  );
  
  return {
    error: errorMessage,
    timestamp: new Date().toISOString(),
  };
}

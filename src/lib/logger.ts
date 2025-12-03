/**
 * Development-only logger utility
 * Prevents console logs from appearing in production builds
 */

export const logger = {
  /**
   * Log messages (development only)
   */
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },

  /**
   * Warning messages (development only)
   */
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },

  /**
   * Debug messages (development only)
   */
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },

  /**
   * Error messages (always logged)
   * Errors should always be visible for monitoring/debugging
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Info messages (development only)
   */
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },
};


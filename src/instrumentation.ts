// Instrumentation for server runtime
// Sentry removed - keeping file for future instrumentation needs

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server runtime initialization
    console.log('Server runtime registered');
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime initialization
    console.log('Edge runtime registered');
  }
}

// Request error handler - simple logging
export function onRequestError(error: Error) {
  console.error('[Request Error]', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
}

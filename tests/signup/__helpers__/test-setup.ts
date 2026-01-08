/**
 * Test Setup for Signup Flow Tests
 * 
 * Provides polyfills and mocks needed for Next.js API route testing
 * Note: Next.js provides its own Request/Response polyfills, so we don't override them
 */

// Polyfill fetch for Node.js environment (if needed)
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = require('node-fetch');
}


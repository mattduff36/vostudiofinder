// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.cjs`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}))

// Load .env.local if it exists (for other env vars)
// CRITICAL: Always exclude DATABASE_URL to prevent tests from connecting to production
// Store any existing DATABASE_URL before loading .env.local to detect all sources
const databaseUrlBeforeDotenv = process.env.DATABASE_URL
const dotenvResult = require('dotenv').config({ path: '.env.local' })
// ALWAYS remove DATABASE_URL if it exists, regardless of source (system env, .env.local, CI/CD, etc.)
// This ensures tests NEVER accidentally connect to production databases
if (process.env.DATABASE_URL) {
  // Detect source before deletion
  const wasInSystemEnv = databaseUrlBeforeDotenv && databaseUrlBeforeDotenv === process.env.DATABASE_URL
  const wasInDotenv = dotenvResult.parsed?.DATABASE_URL && dotenvResult.parsed.DATABASE_URL === process.env.DATABASE_URL
  const source = wasInSystemEnv && wasInDotenv ? 'system environment and .env.local'
    : wasInSystemEnv ? 'system environment'
    : wasInDotenv ? '.env.local'
    : 'unknown source'
  
  delete process.env.DATABASE_URL
  console.warn(`⚠️  DATABASE_URL excluded (source: ${source}) to prevent production connection in tests`)
}

// Polyfill TextDecoder/TextEncoder for Node.js < 18 (if needed)
if (typeof globalThis.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util')
  globalThis.TextDecoder = TextDecoder
  globalThis.TextEncoder = TextEncoder
}

// Polyfill setImmediate for Node.js environments (needed by Prisma)
if (typeof globalThis.setImmediate === 'undefined') {
  // setImmediate is polyfilled using setTimeout, so we return the timeout ID
  // clearImmediate must use that same ID to cancel the corresponding timeout
  globalThis.setImmediate = (fn, ...args) => {
    return setTimeout(() => fn(...args), 0)
  }
  globalThis.clearImmediate = (id) => {
    // Clear the timeout that corresponds to the setImmediate call
    // The ID returned by setImmediate is the timeout ID from setTimeout
    if (id != null) {
      clearTimeout(id)
    }
  }
}

// Polyfill Request/Response for Next.js API routes in Node.js test environment
// Only add if not already present (Next.js may provide these)
// CRITICAL: Polyfill Request/Response BEFORE Next.js modules load
// This must run synchronously before any imports
if (typeof globalThis.Request === 'undefined') {
  try {
    // Try undici first (Node.js 18+ compatible, now installed as dev dependency)
    const undici = require('undici')
    if (undici.Request) {
      globalThis.Request = undici.Request
      globalThis.Response = undici.Response
      globalThis.Headers = undici.Headers
    } else {
      throw new Error('undici.Request not found')
    }
  } catch (e1) {
    try {
      // Fallback to Next.js edge runtime primitives
      const primitives = require('next/dist/compiled/@edge-runtime/primitives')
      globalThis.Request = primitives.Request
      globalThis.Response = primitives.Response
      globalThis.Headers = primitives.Headers
    } catch (e2) {
      // Final fallback: create minimal polyfill
      console.warn('Could not load Request/Response polyfills, creating minimal polyfill:', e2.message)
      
      // Define Headers FIRST so Request and Response can use it
      globalThis.Headers = class Headers {
        constructor(init) {
          this._map = new Map()
          if (init) {
            if (init instanceof Headers) {
              // Copy from another Headers instance
              init._map.forEach((value, key) => this._map.set(key, value))
            } else if (typeof init === 'object' && !Array.isArray(init)) {
              // Plain object or Map
              if (init instanceof Map) {
                init.forEach((value, key) => this._map.set(key.toLowerCase(), value))
              } else {
                Object.entries(init).forEach(([k, v]) => this._map.set(k.toLowerCase(), v))
              }
            }
          }
        }
        get(name) { return this._map.get(name.toLowerCase()) }
        set(name, value) { this._map.set(name.toLowerCase(), value) }
        has(name) { return this._map.has(name.toLowerCase()) }
        delete(name) { 
          this._map.delete(name.toLowerCase())
          // Fetch API spec requires delete() to return undefined, not boolean
          return undefined
        }
        entries() { return this._map.entries() }
        keys() { return this._map.keys() }
        values() { return this._map.values() }
        forEach(callback) { this._map.forEach((value, key) => callback(value, key, this)) }
      }
      
      globalThis.Request = class Request {
        constructor(input, init = {}) {
          // Use Object.defineProperty to set read-only properties
          const url = typeof input === 'string' ? input : input?.url || ''
          Object.defineProperty(this, 'url', { value: url, writable: false, enumerable: true })
          Object.defineProperty(this, 'method', { value: init.method || 'GET', writable: false, enumerable: true })
          // Use Headers class instance to match Fetch API contract
          this.headers = new Headers(init.headers || undefined)
          this.body = init.body
        }
        async json() {
          // Handle different body types safely
          if (this.body === null || this.body === undefined) {
            return {}
          }
          // If body is already an object, return it directly
          if (typeof this.body === 'object' && !(this.body instanceof String)) {
            return this.body
          }
          // If body is a string, parse it
          if (typeof this.body === 'string') {
            return JSON.parse(this.body || '{}')
          }
          // For other types, convert to string first
          return JSON.parse(String(this.body || '{}'))
        }
        async text() {
          if (this.body === null || this.body === undefined) {
            return ''
          }
          // If body is already a string, return it
          if (typeof this.body === 'string') {
            return this.body
          }
          // If body is an object, stringify it
          if (typeof this.body === 'object') {
            return JSON.stringify(this.body)
          }
          // For other types, convert to string
          return String(this.body)
        }
      }
      globalThis.Response = class Response {
        constructor(body, init = {}) {
          this.body = body
          this.status = init.status || 200
          this.statusText = init.statusText || 'OK'
          this.headers = new Headers(init.headers || undefined)
        }
        async json() {
          // Handle different body types safely
          if (this.body === null || this.body === undefined) {
            return {}
          }
          // If body is already an object, return it directly
          if (typeof this.body === 'object' && !(this.body instanceof String)) {
            return this.body
          }
          // If body is a string, parse it
          if (typeof this.body === 'string') {
            return JSON.parse(this.body || '{}')
          }
          // For other types, convert to string first
          return JSON.parse(String(this.body || '{}'))
        }
        async text() {
          if (this.body === null || this.body === undefined) {
            return ''
          }
          // If body is already a string, return it
          if (typeof this.body === 'string') {
            return this.body
          }
          // If body is an object, stringify it
          if (typeof this.body === 'object') {
            return JSON.stringify(this.body)
          }
          // For other types, convert to string
          return String(this.body)
        }
        static json(data, init = {}) {
          // Convert Headers instance to plain object if needed, ensuring Content-Type is set
          // Use lowercase keys to prevent duplicate headers (HTTP headers are case-insensitive)
          let headersObj = { 'content-type': 'application/json' }
          
          // Helper function to normalize header keys to lowercase
          const normalizeHeaders = (headers) => {
            const normalized = {}
            if (headers._map && headers._map instanceof Map) {
              // Our polyfill Headers instance
              headers._map.forEach((value, key) => {
                normalized[key.toLowerCase()] = value
              })
            } else if (typeof headers.entries === 'function') {
              // Standard Headers instance with entries() method (undici, Next.js, etc.)
              try {
                for (const [key, value] of headers.entries()) {
                  normalized[key.toLowerCase()] = value
                }
              } catch (e) {
                // If entries() fails, fall back to plain object handling
                if (typeof headers === 'object' && !Array.isArray(headers) && headers !== null) {
                  Object.entries(headers).forEach(([key, value]) => {
                    normalized[key.toLowerCase()] = value
                  })
                }
              }
            } else if (typeof headers === 'object' && !Array.isArray(headers) && headers !== null) {
              // Plain object - normalize keys to lowercase
              Object.entries(headers).forEach(([key, value]) => {
                normalized[key.toLowerCase()] = value
              })
            }
            return normalized
          }
          
          if (init.headers) {
            const normalizedHeaders = normalizeHeaders(init.headers)
            // Merge normalized headers, with user headers taking precedence
            headersObj = { ...headersObj, ...normalizedHeaders }
            // Invalid types (string, array, null, etc.) are ignored
          }
          
          return new Response(JSON.stringify(data), {
            ...init,
            headers: headersObj,
          })
        }
      }
      // Headers is already defined above, before Request and Response
    }
  }
}

// Mock environment variables (only if not already set)
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'test-secret'
}
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
}
// Set DATABASE_URL fallback for tests (always safe test database)
// CRITICAL: DATABASE_URL was explicitly deleted above to prevent production connections
// This ensures PrismaClient can initialize, but tests requiring database will fail safely
// Tests that need database should set TEST_DATABASE_URL explicitly or use test fixtures
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
  console.warn('⚠️  Using safe test database fallback. Tests requiring database may fail.')
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
  })
}

// Mock window.location methods
// Note: In jsdom, window.location is a special object that cannot be fully mocked
// Individual methods need to be spied on in tests using jest.spyOn(window.location, 'assign')
// The default jsdom location object will be used, which is sufficient for most tests

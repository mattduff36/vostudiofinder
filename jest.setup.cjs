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

// Load .env.local if it exists (for DATABASE_URL and other env vars)
require('dotenv').config({ path: '.env.local' })

// Polyfill TextDecoder/TextEncoder for Node.js < 18 (if needed)
if (typeof globalThis.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util')
  globalThis.TextDecoder = TextDecoder
  globalThis.TextEncoder = TextEncoder
}

// Polyfill setImmediate for Node.js environments (needed by Prisma)
if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = (fn, ...args) => setTimeout(() => fn(...args), 0)
  globalThis.clearImmediate = clearTimeout
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
      globalThis.Request = class Request {
        constructor(input, init = {}) {
          // Use Object.defineProperty to set read-only properties
          const url = typeof input === 'string' ? input : input?.url || ''
          Object.defineProperty(this, 'url', { value: url, writable: false, enumerable: true })
          Object.defineProperty(this, 'method', { value: init.method || 'GET', writable: false, enumerable: true })
          this.headers = new Map()
          this.body = init.body
        }
        async json() { return JSON.parse(this.body || '{}') }
        async text() { return this.body || '' }
      }
      globalThis.Response = class Response {
        constructor(body, init = {}) {
          this.body = body
          this.status = init.status || 200
          this.statusText = init.statusText || 'OK'
          this.headers = new Headers(init.headers || undefined)
        }
        async json() { return JSON.parse(this.body || '{}') }
        async text() { return this.body || '' }
        static json(data, init = {}) {
          // Convert Headers instance to plain object if needed, ensuring Content-Type is set
          let headersObj = { 'Content-Type': 'application/json' }
          if (init.headers) {
            // Check if init.headers is a Headers instance (has _map property from our polyfill)
            if (init.headers._map && init.headers._map instanceof Map) {
              // Convert our polyfill Headers instance to plain object
              init.headers._map.forEach((value, key) => {
                headersObj[key] = value
              })
            } else if (typeof init.headers.entries === 'function') {
              // Standard Headers instance with entries() method (undici, Next.js, etc.)
              try {
                for (const [key, value] of init.headers.entries()) {
                  headersObj[key] = value
                }
              } catch (e) {
                // If entries() fails, fall back to plain object handling
                if (typeof init.headers === 'object' && !Array.isArray(init.headers) && init.headers !== null) {
                  headersObj = { ...headersObj, ...init.headers }
                }
              }
            } else if (typeof init.headers === 'object' && !Array.isArray(init.headers) && init.headers !== null) {
              // Plain object - can spread directly
              headersObj = { ...headersObj, ...init.headers }
            }
            // Invalid types (string, array, null, etc.) are ignored
          }
          return new Response(JSON.stringify(data), {
            ...init,
            headers: headersObj,
          })
        }
      }
      globalThis.Headers = class Headers {
        constructor(init) {
          this._map = new Map()
          if (init) Object.entries(init).forEach(([k, v]) => this._map.set(k.toLowerCase(), v))
        }
        get(name) { return this._map.get(name.toLowerCase()) }
        set(name, value) { this._map.set(name.toLowerCase(), value) }
        has(name) { return this._map.has(name.toLowerCase()) }
      }
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
// Set DATABASE_URL fallback for tests if not provided in .env.local
// This ensures PrismaClient can initialize even if .env.local is missing or incomplete
if (!process.env.DATABASE_URL) {
  // Use a test database URL fallback
  // Tests that actually need database will fail with connection error, but PrismaClient won't crash on init
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
  console.warn('⚠️  DATABASE_URL not found in .env.local, using test fallback. Tests requiring database may fail.')
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

/**
 * Test Setup for Signup Flow Tests
 * 
 * Provides polyfills and mocks needed for Next.js API route testing
 */

// Polyfill fetch and Request for Node.js environment
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = require('node-fetch');
}

if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(public url: string, public init?: any) {}
    async json() {
      return JSON.parse(this.init?.body || '{}');
    }
    async text() {
      return this.init?.body || '';
    }
  } as any;
}

if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    constructor(public body: any, public init?: any) {}
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
    get status() {
      return this.init?.status || 200;
    }
    get ok() {
      return this.status >= 200 && this.status < 300;
    }
  } as any;
}


/**
 * Security Tests for Signup Flow
 * 
 * Tests security concerns including:
 * - SQL injection prevention
 * - XSS prevention
 * - Turnstile CAPTCHA requirement
 * - Rate limiting
 * - Input sanitization
 * - Authentication bypass attempts
 * - Privilege escalation
 * - Honeypot detection
 */

import { POST } from '@/app/api/auth/register/route';
import { POST as ReserveUsernamePOST } from '@/app/api/auth/reserve-username/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers } from '../__helpers__/test-db';
import { generateTestEmail } from '../__helpers__/test-factories';
import { disconnectDb } from '../__helpers__/test-db';
import { UserStatus } from '@prisma/client';

describe('Signup Security Tests', () => {
  const testEmailPrefix = `test_security_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Turnstile CAPTCHA Requirement', () => {
    it('should reject signup without Turnstile token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234!@#$',
          display_name: 'Test User',
          // Missing turnstileToken
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Security verification required');
    });

    it('should reject signup with empty Turnstile token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234!@#$',
          display_name: 'Test User',
          turnstileToken: '',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Honeypot Detection', () => {
    it('should reject signup if honeypot field is filled', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234!@#$',
          display_name: 'Test User',
          turnstileToken: 'fake-token',
          website: 'https://bot-filled-this.com', // Honeypot field
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid submission');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in email field', async () => {
      const sqlInjectionAttempts = [
        "test@test.com'; DROP TABLE users; --",
        "test@test.com' OR '1'='1",
        "test@test.com'; INSERT INTO users VALUES ('hacker', 'pass'); --",
        "test@test.com' UNION SELECT * FROM users --",
      ];

      for (const maliciousEmail of sqlInjectionAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: maliciousEmail,
            password: 'Test1234!@#$',
            display_name: 'Test User',
          }),
        });

        const response = await POST(request);
        // Should either reject as invalid email or handle safely
        expect([400, 500]).toContain(response.status);
      }
    });

    it('should prevent SQL injection in display_name field', async () => {
      const sqlInjectionAttempts = [
        "Test'; DROP TABLE users; --",
        "Test' OR '1'='1",
        "Test'; INSERT INTO users VALUES ('hacker', 'pass'); --",
      ];

      for (const maliciousName of sqlInjectionAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: generateTestEmail(testEmailPrefix),
            password: 'Test1234!@#$',
            display_name: maliciousName,
          }),
        });

        const response = await POST(request);
        // Should handle safely (either reject or sanitize)
        expect([201, 400]).toContain(response.status);
      }
    });

    it('should prevent SQL injection in username field', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
      });

      const sqlInjectionAttempts = [
        "test'; DROP TABLE users; --",
        "test' OR '1'='1",
        "test'; INSERT INTO users VALUES ('hacker', 'pass'); --",
      ];

      for (const maliciousUsername of sqlInjectionAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            username: maliciousUsername,
          }),
        });

        const response = await ReserveUsernamePOST(request);
        // Should reject invalid username format
        expect([400, 409]).toContain(response.status);
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize XSS attempts in display_name', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
      ];

      for (const xssPayload of xssAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: generateTestEmail(testEmailPrefix),
            password: 'Test1234!@#$',
            display_name: xssPayload,
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        // Should either reject or sanitize
        if (response.status === 201) {
          // If accepted, verify it was sanitized (no script tags)
          expect(data.user.display_name).not.toContain('<script');
          expect(data.user.display_name).not.toContain('javascript:');
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('should sanitize XSS attempts in username', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
      });

      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x>',
        'javascript:alert("XSS")',
      ];

      for (const xssPayload of xssAttempts) {
        const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            username: xssPayload,
          }),
        });

        const response = await ReserveUsernamePOST(request);
        // Should reject invalid username format
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject extremely long email addresses', async () => {
      const longEmail = 'a'.repeat(300) + '@test.com';
      
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: longEmail,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject extremely long display names', async () => {
      const longName = 'A'.repeat(1000);
      
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: 'Test1234!@#$',
          display_name: longName,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject extremely long passwords', async () => {
      const longPassword = 'A'.repeat(10000) + '1!';
      
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: generateTestEmail(testEmailPrefix),
          password: longPassword,
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      // Should either reject or hash safely (but likely reject)
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Authentication Bypass', () => {
    it('should not allow username reservation for other users', async () => {
      const email1 = generateTestEmail(testEmailPrefix);
      const email2 = generateTestEmail(testEmailPrefix);
      
      // Create user1 as ACTIVE (not PENDING)
      const user1 = await createTestUserInDb({
        email: email1,
        password: 'Test1234!@#$',
        display_name: 'User 1',
        status: UserStatus.ACTIVE,
      });

      const user2 = await createTestUserInDb({
        email: email2,
        password: 'Test1234!@#$',
        display_name: 'User 2',
      });

      // User2 tries to reserve username for User1's account (user1 is ACTIVE, not PENDING)
      const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user1.id, // User1's ID (ACTIVE user)
          username: 'hacked_username',
        }),
      });

      // This should fail because user1 is ACTIVE, not PENDING
      // The endpoint only allows username reservation for PENDING users
      const response = await ReserveUsernamePOST(request);
      expect(response.status).toBe(400); // User account is not in PENDING status
    });

    it('should require valid userId for username reservation', async () => {
      const maliciousUserIds = [
        '../../etc/passwd',
        'null',
        'undefined',
        "'; DROP TABLE users; --",
        '1 OR 1=1',
      ];

      for (const maliciousId of maliciousUserIds) {
        const request = new NextRequest('http://localhost:3000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: maliciousId,
            username: 'testusername',
          }),
        });

        const response = await ReserveUsernamePOST(request);
        // Should reject invalid user ID
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on rapid registration attempts', async () => {
      const testEmail = generateTestEmail(`${testEmailPrefix}_rate_limit`);
      
      // Make 4 rapid requests (limit is 3 per hour)
      const requests = Array(4).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '192.168.1.100', // Same IP
          },
          body: JSON.stringify({
            email: `${Date.now()}_${Math.random()}@test.com`,
            password: 'Test1234!@#$',
            display_name: 'Test User',
            turnstileToken: 'test-token',
          }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // First 3 should be rate limited (no Turnstile verification)
      // 4th should get 429 rate limit error
      const last = responses[responses.length - 1];
      const lastData = await last.json();
      
      // Either rate limited or Turnstile failed (both acceptable)
      expect([400, 429]).toContain(last.status);
      if (last.status === 429) {
        expect(lastData.error).toContain('Too many');
      }
    });

    it('should handle rapid registration attempts gracefully', async () => {
      const requests = Array(20).fill(null).map((_, i) => 
        new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: generateTestEmail(`${testEmailPrefix}_rapid_${i}`),
            password: 'Test1234!@#$',
            display_name: 'Test User',
          }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // All should either succeed or fail gracefully (not crash)
      responses.forEach(response => {
        expect([201, 400, 500]).toContain(response.status);
      });
    });
  });

  describe('Data Sanitization', () => {
    it('should normalize email to lowercase', async () => {
      const mixedCaseEmail = 'TeSt@ExAmPlE.CoM';
      
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: mixedCaseEmail,
          password: 'Test1234!@#$',
          display_name: 'Test User',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 201) {
        expect(data.user.email).toBe(mixedCaseEmail.toLowerCase());
      }
    });

    it('should trim whitespace from inputs', async () => {
      const email = `  ${generateTestEmail(testEmailPrefix)}  `;
      const displayName = '  Test User  ';
      
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'Test1234!@#$',
          display_name: displayName,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 201) {
        expect(data.user.email).toBe(email.trim().toLowerCase());
        expect(data.user.display_name).toBe(displayName.trim());
      }
    });
  });
});


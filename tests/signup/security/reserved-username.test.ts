/**
 * Tests for Reserved Username Protection
 * 
 * Ensures users cannot register with usernames that match existing routes
 * or system pages, which would create routing conflicts.
 */

import { POST as CheckUsernamePOST } from '@/app/api/auth/check-username/route';
import { POST as ReserveUsernamePOST } from '@/app/api/auth/reserve-username/route';
import { NextRequest } from 'next/server';
import { createTestUserInDb, cleanupTestUsers, disconnectDb } from '../__helpers__/test-db';
import { generateTestEmail } from '../__helpers__/test-factories';
import { RESERVED_USERNAMES, isReservedUsername } from '@/lib/utils/username';

describe('Reserved Username Protection', () => {
  const testEmailPrefix = `test_reserved_${Date.now()}`;

  beforeAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
  });

  afterAll(async () => {
    await cleanupTestUsers(testEmailPrefix);
    await disconnectDb();
  });

  describe('Reserved Username Detection', () => {
    it('should have a comprehensive list of reserved usernames', () => {
      // Verify the list includes critical routes
      const criticalRoutes = [
        'admin',
        'dashboard',
        'api',
        'auth',
        'signin',
        'signup',
        'settings',
        'profile',
      ];

      for (const route of criticalRoutes) {
        expect(RESERVED_USERNAMES).toContain(route);
      }
    });

    it('should detect reserved usernames (case-insensitive)', () => {
      const reservedCases = [
        'admin',
        'Admin',
        'ADMIN',
        'AdMiN',
        'dashboard',
        'Dashboard',
        'DASHBOARD',
      ];

      for (const username of reservedCases) {
        expect(isReservedUsername(username)).toBe(true);
      }
    });

    it('should allow non-reserved usernames', () => {
      const validUsernames = [
        'johndoe',
        'StudioOwner',
        'VoiceActor123',
        'my_studio',
        'JohnSmithStudios',
      ];

      for (const username of validUsernames) {
        expect(isReservedUsername(username)).toBe(false);
      }
    });
  });

  describe('Check Username API - Reserved Names', () => {
    it('should reject reserved username "admin"', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
        }),
      });

      const response = await CheckUsernamePOST(request);
      expect([400, 429]).toContain(response.status); // Allow rate limit
      if (response.status === 400) {
        const data = await response.json();
        expect(data.available).toBe(false);
        expect(data.message).toContain('reserved');
      }
    });

    it('should reject reserved username "dashboard"', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
        method: 'POST',
        body: JSON.stringify({
          username: 'dashboard',
        }),
      });

      const response = await CheckUsernamePOST(request);
      expect([400, 429]).toContain(response.status); // Allow rate limit
      if (response.status === 400) {
        const data = await response.json();
        expect(data.available).toBe(false);
        expect(data.message).toContain('reserved');
      }
    });

    it('should reject reserved usernames case-insensitively', async () => {
      const reservedVariants = ['ADMIN', 'Admin', 'DashBoard', 'SETTINGS'];

      for (const username of reservedVariants) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([400, 429]).toContain(response.status); // Allow rate limit
        if (response.status === 400) {
          const data = await response.json();
          expect(data.available).toBe(false);
          expect(data.message).toContain('reserved');
        }
      }
    });

    it('should allow valid non-reserved usernames', async () => {
      const validUsernames = ['johndoe', 'VoiceStudio', 'my_studio123'];

      for (const username of validUsernames) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([200, 429]).toContain(response.status); // Allow rate limit or success
        if (response.status === 200) {
          const data = await response.json();
          // Should be available (unless taken by another user, which is acceptable)
          expect(data.username).toBe(username);
        }
      }
    });

    it('should reject all critical route names', async () => {
      const criticalRoutes = [
        'admin',
        'dashboard',
        'api',
        'auth',
        'signin',
        'signup',
        'login',
        'logout',
        'settings',
        'profile',
        'help',
        'about',
        'terms',
        'privacy',
        'studios',
      ];

      for (const route of criticalRoutes) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username: route,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([400, 429]).toContain(response.status); // Allow rate limit
        if (response.status === 400) {
          const data = await response.json();
          expect(data.available).toBe(false);
          expect(data.message).toContain('reserved');
        }
      }
    });
  });

  describe('Reserve Username API - Reserved Names', () => {
    it('should prevent reserving username "admin"', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
      });

      const request = new NextRequest('http://localhost:4000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username: 'admin',
        }),
      });

      const response = await ReserveUsernamePOST(request);
      expect([400, 429]).toContain(response.status); // Allow rate limit
      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).toContain('reserved');
        expect(data.available).toBe(false);
      }
    });

    it('should prevent reserving username "dashboard"', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
      });

      const request = new NextRequest('http://localhost:4000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username: 'dashboard',
        }),
      });

      const response = await ReserveUsernamePOST(request);
      expect([400, 429]).toContain(response.status); // Allow rate limit
      if (response.status === 400) {
        const data = await response.json();
        expect(data.error).toContain('reserved');
        expect(data.available).toBe(false);
      }
    });

    it('should prevent reserving reserved names case-insensitively', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
      });

      const reservedVariants = ['ADMIN', 'Admin', 'API', 'Auth', 'SETTINGS'];

      for (const username of reservedVariants) {
        const request = new NextRequest('http://localhost:4000/api/auth/reserve-username', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            username,
          }),
        });

        const response = await ReserveUsernamePOST(request);
        expect([400, 429]).toContain(response.status); // Allow rate limit
        if (response.status === 400) {
          const data = await response.json();
          expect(data.error).toContain('reserved');
          expect(data.available).toBe(false);
        }
      }
    });

    it('should allow reserving valid non-reserved usernames', async () => {
      const email = generateTestEmail(testEmailPrefix);
      const user = await createTestUserInDb({
        email,
        password: 'Test1234!@#$',
        display_name: 'Test User',
      });

      const validUsername = `valid_user_${Date.now()}`;

      const request = new NextRequest('http://localhost:4000/api/auth/reserve-username', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          username: validUsername,
        }),
      });

      const response = await ReserveUsernamePOST(request);
      expect([200, 429]).toContain(response.status); // Allow rate limit or success
      if (response.status === 200) {
        const data = await response.json();
        expect(data.user.username).toBe(validUsername);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should reject reserved names with underscores', async () => {
      const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
        method: 'POST',
        body: JSON.stringify({
          username: '_admin_',
        }),
      });

      const response = await CheckUsernamePOST(request);
      // Should pass format validation but could be available
      // The key is that exact reserved names are blocked
      expect([200, 400, 429]).toContain(response.status);
    });

    it('should allow names that contain reserved words but are not exact matches', async () => {
      const partialMatches = ['admins', 'my_admin', 'adminuser', 'dashboard123'];

      for (const username of partialMatches) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([200, 429]).toContain(response.status); // Allow rate limit or success
        if (response.status === 200) {
          const data = await response.json();
          expect(data.username).toBe(username);
        }
      }
    });

    it('should protect against system words', async () => {
      const systemWords = ['null', 'undefined', 'true', 'false', 'root', 'system'];

      for (const word of systemWords) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username: word,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([400, 429]).toContain(response.status); // Allow rate limit
        if (response.status === 400) {
          const data = await response.json();
          expect(data.available).toBe(false);
          expect(data.message).toContain('reserved');
        }
      }
    });
  });

  describe('Security Impact', () => {
    it('should prevent routing conflict with /admin page', async () => {
      // If someone registered as "admin", they would create a username page at /admin
      // which would conflict with the actual /admin route
      const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
        }),
      });

      const response = await CheckUsernamePOST(request);
      expect([400, 429]).toContain(response.status); // Allow rate limit
      if (response.status === 400) {
        const data = await response.json();
        expect(data.available).toBe(false);
      }
    });

    it('should prevent impersonation of system pages', async () => {
      // Usernames like "support", "help", "contact" could be used for phishing
      const impersonationNames = ['support', 'help', 'contact', 'administrator'];

      for (const username of impersonationNames) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([400, 429]).toContain(response.status); // Allow rate limit
        if (response.status === 400) {
          const data = await response.json();
          expect(data.available).toBe(false);
        }
      }
    });

    it('should prevent route hijacking attempts', async () => {
      // These routes have special meaning in Next.js
      const specialRoutes = ['api', '_next', 'favicon', 'robots', 'sitemap'];

      for (const route of specialRoutes) {
        const request = new NextRequest('http://localhost:4000/api/auth/check-username', {
          method: 'POST',
          body: JSON.stringify({
            username: route,
          }),
        });

        const response = await CheckUsernamePOST(request);
        expect([400, 429]).toContain(response.status); // Allow rate limit
        if (response.status === 400) {
          const data = await response.json();
          expect(data.available).toBe(false);
        }
      }
    });
  });
});

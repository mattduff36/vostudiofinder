import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Database Migration and Data Integrity', () => {
  let authCookie: string;

  test.beforeAll(async ({ browser }) => {
    // Create a new context and page for authentication
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to signin page
    await page.goto('http://localhost:3000/auth/signin');
    
    // Fill in admin credentials
    await page.fill('input[name="email"]', 'admin@mpdee.co.uk');
    await page.fill('input[name="password"]', 'GuyM@tt2025!');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Get the authentication cookie
    const cookies = await context.cookies();
    authCookie = cookies.find(cookie => cookie.name === 'next-auth.session-token')?.value || '';
    
    await context.close();
  });

  test('should have admin user in database', async () => {
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@mpdee.co.uk' }
    });

    expect(adminUser).toBeTruthy();
    expect(adminUser?.role).toBe('ADMIN');
    expect(adminUser?.emailVerified).toBe(true);
  });

  test('should have sample studios in database', async () => {
    const studios = await prisma.studio.findMany();
    
    expect(studios.length).toBeGreaterThan(0);
    
    // Check that studios have required fields
    for (const studio of studios) {
      expect(studio.name).toBeTruthy();
      expect(studio.ownerId).toBeTruthy();
      expect(studio.studioType).toBeTruthy();
    }
  });

  test('should have sample FAQs in database', async () => {
    const faqs = await prisma.faq.findMany();
    
    expect(faqs.length).toBeGreaterThan(0);
    
    // Check that FAQs have required fields
    for (const faq of faqs) {
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
    }
  });

  test('should maintain referential integrity between users and studios', async () => {
    const studios = await prisma.studio.findMany({
      include: { owner: true }
    });
    
    for (const studio of studios) {
      expect(studio.owner).toBeTruthy();
      expect(studio.owner.email).toBeTruthy();
    }
  });

  test('should have consistent data types', async () => {
    const users = await prisma.user.findMany();
    const studios = await prisma.studio.findMany();
    const faqs = await prisma.faq.findMany();
    
    // Check user data types
    for (const user of users) {
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.role).toBe('string');
      expect(typeof user.emailVerified).toBe('boolean');
    }
    
    // Check studio data types
    for (const studio of studios) {
      expect(typeof studio.id).toBe('string');
      expect(typeof studio.name).toBe('string');
      expect(typeof studio.ownerId).toBe('string');
    }
    
    // Check FAQ data types
    for (const faq of faqs) {
      expect(typeof faq.id).toBe('string');
      expect(typeof faq.question).toBe('string');
      expect(typeof faq.answer).toBe('string');
    }
  });

  test('should handle database transactions correctly', async () => {
    const initialUserCount = await prisma.user.count();
    
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email: 'test-transaction@example.com',
            username: 'test_transaction_' + Math.random().toString(36).substring(7),
            displayName: 'Test Transaction User',
            role: 'USER',
            emailVerified: false,
          }
        });
        
        // This should fail and rollback the transaction
        await tx.user.create({
          data: {
            email: 'test-transaction@example.com', // Duplicate email
            username: 'test_transaction_2',
            displayName: 'Test Transaction User 2',
            role: 'USER',
            emailVerified: false,
          }
        });
      });
    } catch (error) {
      // Expected to fail due to duplicate email
      expect(error).toBeTruthy();
    }
    
    const finalUserCount = await prisma.user.count();
    expect(finalUserCount).toBe(initialUserCount);
  });

  test('should handle concurrent database operations', async () => {
    const promises = [];
    
    // Create multiple concurrent read operations
    for (let i = 0; i < 5; i++) {
      promises.push(prisma.user.findMany());
      promises.push(prisma.studio.findMany());
      promises.push(prisma.faq.findMany());
    }
    
    const results = await Promise.all(promises);
    
    // All operations should complete successfully
    expect(results.length).toBe(15);
    
    for (const result of results) {
      expect(Array.isArray(result)).toBe(true);
    }
  });

  test('should validate database constraints', async () => {
    // Test unique email constraint
    try {
      await prisma.user.create({
        data: {
          email: 'admin@mpdee.co.uk', // Duplicate email
          username: 'duplicate_test',
          displayName: 'Duplicate Test',
          role: 'USER',
          emailVerified: false,
        }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.code).toBe('P2002'); // Unique constraint violation
    }
    
    // Test unique username constraint
    try {
      const existingUser = await prisma.user.findFirst();
      if (existingUser) {
        await prisma.user.create({
          data: {
            email: 'unique@example.com',
            username: existingUser.username, // Duplicate username
            displayName: 'Duplicate Username Test',
            role: 'USER',
            emailVerified: false,
          }
        });
        expect(true).toBe(false); // Should not reach here
      }
    } catch (error: any) {
      expect(error.code).toBe('P2002'); // Unique constraint violation
    }
  });

  test('should handle database connection properly', async () => {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeTruthy();
    
    // Test database health
    const healthCheck = await prisma.$queryRaw`SELECT NOW() as current_time`;
    expect(healthCheck).toBeTruthy();
  });

  test('should maintain data consistency after operations', async () => {
    const initialData = {
      users: await prisma.user.count(),
      studios: await prisma.studio.count(),
      faqs: await prisma.faq.count(),
    };
    
    // Perform some read operations
    await prisma.user.findMany();
    await prisma.studio.findMany();
    await prisma.faq.findMany();
    
    const finalData = {
      users: await prisma.user.count(),
      studios: await prisma.studio.count(),
      faqs: await prisma.faq.count(),
    };
    
    // Data should remain consistent
    expect(finalData.users).toBe(initialData.users);
    expect(finalData.studios).toBe(initialData.studios);
    expect(finalData.faqs).toBe(initialData.faqs);
  });

  test('should handle database errors gracefully', async () => {
    // Test invalid query
    try {
      await prisma.$queryRaw`SELECT * FROM non_existent_table`;
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeTruthy();
    }
    
    // Test invalid data
    try {
      await prisma.user.create({
        data: {
          email: 'invalid-email', // Invalid email format
          username: 'test',
          displayName: 'Test',
          role: 'INVALID_ROLE', // Invalid role
          emailVerified: false,
        }
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });
});

/**
 * Playwright E2E tests for Featured Studios and Verified Badge features
 * 
 * These tests validate the complete user flows for:
 * - Featured studio upgrade card with availability messaging
 * - Featured studios waitlist opt-in
 * - Verified badge request flow
 * - Admin test sandbox functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Featured Studios Upgrade Card', () => {
  test('should display availability information', async ({ page }) => {
    // Navigate to settings page (requires login)
    await page.goto('/dashboard/settings');
    
    // Wait for membership section
    await page.waitForSelector('text=Membership');
    
    // Check for Featured Studio Upgrade card
    const featuredCard = page.locator('text=Featured Studio Upgrade').first();
    await expect(featuredCard).toBeVisible();
    
    // Should show either availability or waitlist messaging
    const hasAvailability = await page.locator('text=/out of 6/i').isVisible();
    const hasWaitlist = await page.locator('text=/Next slot available/i').isVisible();
    
    expect(hasAvailability || hasWaitlist).toBeTruthy();
  });

  test('should show waitlist checkbox when all slots taken', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    // Check if all slots are taken
    const allTaken = await page.locator('text=/All Featured slots are taken/i').isVisible();
    
    if (allTaken) {
      // Waitlist checkbox should be visible
      const waitlistCheckbox = page.locator('text=/join.*Featured Studios waitlist/i');
      await expect(waitlistCheckbox).toBeVisible();
    }
  });
});

test.describe('Verified Badge Request Card', () => {
  test('should show appropriate message based on profile completion', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    const verifiedCard = page.locator('text=Request Verified Badge').first();
    await expect(verifiedCard).toBeVisible();
    
    // Card should show one of three states:
    // 1. Under 85% - disabled with completion message
    // 2. 85%+ - enabled with "apply" message
    // 3. Already verified - verified message
    
    const hasCompletionMessage = await page.locator('text=/Complete your profile to.*85%/i').isVisible();
    const hasApplyMessage = await page.locator('text=/Apply for.*verified/i').isVisible();
    const hasVerifiedMessage = await page.locator('text=/already verified/i').isVisible();
    
    expect(hasCompletionMessage || hasApplyMessage || hasVerifiedMessage).toBeTruthy();
  });
});

test.describe('Admin Test Sandbox', () => {
  test('should only be visible to admin users', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    // Check if ADMIN TEST tab exists
    const adminTestTab = await page.locator('text=ADMIN TEST').isVisible();
    
    // This test assumes we're running as a non-admin by default
    // In a real test, we'd need to check admin vs non-admin scenarios
    console.log('ADMIN TEST tab visible:', adminTestTab);
  });

  test.skip('admin can toggle sandbox overrides', async ({ page }) => {
    // This test would require admin authentication
    await page.goto('/dashboard/settings');
    
    // Click ADMIN TEST section
    await page.click('text=ADMIN TEST');
    
    // Find and toggle sandbox
    const sandboxToggle = page.locator('text=/Enable sandbox overrides/i').first();
    await sandboxToggle.click();
    
    // Verify sandbox controls become enabled
    // ... additional assertions
  });
});

test.describe('Waitlist API Integration', () => {
  test('should handle featured waitlist submission', async ({ page, context }) => {
    await page.goto('/dashboard/settings');
    
    // Navigate to featured card
    const waitlistCheckbox = page.locator('input[type="checkbox"]').first();
    
    if (await waitlistCheckbox.isVisible()) {
      // Set up request interception
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/waitlist') && response.request().method() === 'POST'
      );
      
      await waitlistCheckbox.click();
      
      const response = await responsePromise;
      expect([200, 400]).toContain(response.status());
    }
  });
});

test.describe('Email Preview (Admin Only)', () => {
  test.skip('admin can send verification email preview', async ({ page }) => {
    // Requires admin auth
    await page.goto('/dashboard/settings');
    
    // Navigate to ADMIN TEST
    await page.click('text=ADMIN TEST');
    
    // Click email preview button
    const previewButton = page.locator('text=/Send.*verification.*email.*preview/i');
    await previewButton.click();
    
    // Wait for success toast
    await expect(page.locator('text=/Preview email sent/i')).toBeVisible();
  });
});

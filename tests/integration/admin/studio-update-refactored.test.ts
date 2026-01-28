/**
 * Integration Test: Admin Studio Update API with Refactored Helpers
 * Tests the complete PUT /api/admin/studios/[id] flow
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Admin Studio Update API - Integration', () => {
  let testUserId: string;
  let testStudioId: string;

  beforeAll(async () => {
    // Create test user and studio
    testUserId = randomBytes(12).toString('base64url');
    const testEmail = `test-admin-${Date.now()}@example.com`;

    await db.users.create({
      data: {
        id: testUserId,
        email: testEmail,
        username: `testuser${Date.now()}`,
        display_name: 'Test User',
        password: 'test-password',
        status: 'ACTIVE',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    testStudioId = randomBytes(12).toString('base64url');
    await db.studio_profiles.create({
      data: {
        id: testStudioId,
        user_id: testUserId,
        name: 'Test Studio',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testStudioId) {
      await db.studio_profiles.deleteMany({ where: { id: testStudioId } });
    }
    if (testUserId) {
      await db.users.deleteMany({ where: { id: testUserId } });
    }
  });

  it('should successfully build and merge field updates', async () => {
    const { buildUserUpdate, buildStudioUpdate, buildProfileUpdate } = 
      await import('@/lib/admin/studios/update/field-mapping');

    const body = {
      display_name: 'Updated Name',
      _meta: {
        studio_name: 'Updated Studio',
        full_address: '456 New St',
        about: 'Updated about text',
        showrates: '1',
      },
    };

    const userUpdates = buildUserUpdate(body);
    const studioUpdates = buildStudioUpdate(body);
    const profileUpdates = buildProfileUpdate(body);

    expect(userUpdates).toHaveProperty('display_name', 'Updated Name');
    expect(studioUpdates).toHaveProperty('name', 'Updated Studio');
    expect(studioUpdates).toHaveProperty('full_address', '456 New St');
    expect(profileUpdates).toHaveProperty('about', 'Updated about text');
    expect(profileUpdates).toHaveProperty('show_rates', true);
  });

  it('should validate featured status transition rules', async () => {
    const { validateFeaturedTransition } = await import('@/lib/admin/studios/update/featured');

    // Should fail without expiry date
    const result1 = await validateFeaturedTransition(
      testStudioId,
      true,
      false,
      undefined
    );

    expect(result1.valid).toBe(false);
    expect(result1.error).toContain('expiry date is required');

    // Should pass with valid future date
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    const result2 = await validateFeaturedTransition(
      testStudioId,
      true,
      false,
      futureDate.toISOString()
    );

    expect(result2.valid).toBe(true);
  });

  it('should detect manual coordinate override correctly', async () => {
    const { detectManualCoordinateOverride, parseRequestCoordinates } = 
      await import('@/lib/admin/studios/update/geocoding');

    const existingLat = 51.5074;
    const existingLng = -0.1278;

    // Parse new coordinates
    const { lat: requestLat, lng: requestLng } = parseRequestCoordinates('51.5075', '-0.1279');

    // Should detect change
    const hasChanged = detectManualCoordinateOverride(
      existingLat,
      existingLng,
      requestLat,
      requestLng
    );

    expect(hasChanged).toBe(true);
  });
});

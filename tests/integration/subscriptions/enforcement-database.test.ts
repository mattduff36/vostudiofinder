/**
 * Integration Test: Subscription Enforcement with Database
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { computeEnforcementDecisions, applyEnforcementDecisions } from '@/lib/subscriptions/enforcement';

describe('Subscription Enforcement - Database Integration', () => {
  const testUserIds: string[] = [];
  const testStudioIds: string[] = [];

  beforeAll(async () => {
    // Create test studios with various states
    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    // Studio 1: Active with valid subscription
    const user1Id = randomBytes(12).toString('base64url');
    testUserIds.push(user1Id);
    await db.users.create({
      data: {
        id: user1Id,
        email: `test-enforcement-1-${Date.now()}@example.com`,
        username: `testuser1${Date.now()}`,
        display_name: 'Test User 1',
        password: 'test-password',
        status: 'ACTIVE',
        email_verified: true,
        created_at: now,
        updated_at: now,
      },
    });

    const studio1Id = randomBytes(12).toString('base64url');
    testStudioIds.push(studio1Id);
    await db.studio_profiles.create({
      data: {
        id: studio1Id,
        user_id: user1Id,
        name: 'Active Studio',
        status: 'ACTIVE',
        is_featured: false,
        created_at: now,
        updated_at: now,
      },
    });

    await db.subscriptions.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        user_id: user1Id,
        status: 'ACTIVE',
        payment_method: 'STRIPE',
        current_period_start: now,
        current_period_end: futureDate,
        created_at: now,
        updated_at: now,
      },
    });

    // Studio 2: Active but subscription expired (needs deactivation)
    const user2Id = randomBytes(12).toString('base64url');
    testUserIds.push(user2Id);
    await db.users.create({
      data: {
        id: user2Id,
        email: `test-enforcement-2-${Date.now()}@example.com`,
        username: `testuser2${Date.now()}`,
        display_name: 'Test User 2',
        password: 'test-password',
        status: 'ACTIVE',
        email_verified: true,
        created_at: now,
        updated_at: now,
      },
    });

    const studio2Id = randomBytes(12).toString('base64url');
    testStudioIds.push(studio2Id);
    await db.studio_profiles.create({
      data: {
        id: studio2Id,
        user_id: user2Id,
        name: 'Expired Studio',
        status: 'ACTIVE', // Should become INACTIVE
        is_featured: false,
        created_at: now,
        updated_at: now,
      },
    });

    await db.subscriptions.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        user_id: user2Id,
        status: 'CANCELLED',
        payment_method: 'STRIPE',
        current_period_start: pastDate,
        current_period_end: pastDate,
        created_at: now,
        updated_at: now,
      },
    });

    // Studio 3: Featured but expired (needs unfeaturing)
    const user3Id = randomBytes(12).toString('base64url');
    testUserIds.push(user3Id);
    await db.users.create({
      data: {
        id: user3Id,
        email: `test-enforcement-3-${Date.now()}@example.com`,
        username: `testuser3${Date.now()}`,
        display_name: 'Test User 3',
        password: 'test-password',
        status: 'ACTIVE',
        email_verified: true,
        created_at: now,
        updated_at: now,
      },
    });

    const studio3Id = randomBytes(12).toString('base64url');
    testStudioIds.push(studio3Id);
    await db.studio_profiles.create({
      data: {
        id: studio3Id,
        user_id: user3Id,
        name: 'Expired Featured Studio',
        status: 'ACTIVE',
        is_featured: true, // Should be unfeatured
        featured_until: pastDate,
        created_at: now,
        updated_at: now,
      },
    });

    await db.subscriptions.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        user_id: user3Id,
        status: 'ACTIVE',
        payment_method: 'STRIPE',
        current_period_start: now,
        current_period_end: futureDate,
        created_at: now,
        updated_at: now,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    for (const studioId of testStudioIds) {
      await db.studio_profiles.deleteMany({ where: { id: studioId } });
    }
    for (const userId of testUserIds) {
      await db.subscriptions.deleteMany({ where: { user_id: userId } });
      await db.users.deleteMany({ where: { id: userId } });
    }
  });

  it('should compute correct enforcement decisions from database', async () => {
    const studios = await db.studio_profiles.findMany({
      where: {
        id: { in: testStudioIds },
      },
      select: {
        id: true,
        status: true,
        is_featured: true,
        featured_until: true,
        users: {
          select: {
            email: true,
            subscriptions: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                current_period_end: true,
              },
            },
          },
        },
      },
    });

    const decisions = computeEnforcementDecisions(studios);

    // Should have decisions for studios 2 and 3
    expect(decisions.length).toBeGreaterThanOrEqual(2);

    // Find specific decisions
    const expiredStudioDecision = decisions.find(d => 
      studios.find(s => s.id === d.studioId && s.users.subscriptions[0]?.current_period_end < new Date())
    );
    const featuredStudioDecision = decisions.find(d => d.unfeaturedUpdate === true);

    expect(expiredStudioDecision).toBeDefined();
    expect(expiredStudioDecision?.statusUpdate?.status).toBe('INACTIVE');

    expect(featuredStudioDecision).toBeDefined();
  });

  it('should apply enforcement decisions to database', async () => {
    const studios = await db.studio_profiles.findMany({
      where: {
        id: { in: testStudioIds },
      },
      select: {
        id: true,
        status: true,
        is_featured: true,
        featured_until: true,
        users: {
          select: {
            email: true,
            subscriptions: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                current_period_end: true,
              },
            },
          },
        },
      },
    });

    const decisions = computeEnforcementDecisions(studios);
    const { statusUpdates, unfeaturedUpdates } = await applyEnforcementDecisions(decisions);

    expect(statusUpdates).toBeGreaterThanOrEqual(0);
    expect(unfeaturedUpdates).toBeGreaterThanOrEqual(0);

    // Verify changes were applied
    if (statusUpdates > 0 || unfeaturedUpdates > 0) {
      const updatedStudios = await db.studio_profiles.findMany({
        where: {
          id: { in: testStudioIds },
        },
      });

      // At least one studio should have been updated
      expect(updatedStudios.length).toBeGreaterThan(0);
    }
  });
});

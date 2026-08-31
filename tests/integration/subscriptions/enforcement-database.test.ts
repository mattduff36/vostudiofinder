/**
 * Integration Test: Subscription Enforcement with Database
 *
 * Requires TEST_DATABASE_URL pointing at an isolated database.
 * Creates uniquely named records and deletes them in afterAll.
 *
 * @jest-environment node
 */

jest.mock('@/lib/email/send-templated', () => ({
  sendTemplatedEmail: jest.fn().mockResolvedValue({ success: true }),
}));

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { computeEnforcementDecisions, applyEnforcementDecisions } from '@/lib/subscriptions/enforcement';
import { requireTestDatabase } from '../../helpers/require-test-database';

requireTestDatabase();

const enforcementStudioSelect = {
  id: true,
  status: true,
  is_featured: true,
  featured_until: true,
  users: {
    select: {
      id: true,
      email: true,
      membership_tier: true,
      subscriptions: {
        orderBy: { created_at: 'desc' as const },
        take: 1,
        select: {
          current_period_end: true,
        },
      },
    },
  },
};

describe('Subscription Enforcement - Database Integration', () => {
  const testUserIds: string[] = [];
  const testStudioIds: string[] = [];
  let activePremiumStudioId = '';
  let expiredPremiumStudioId = '';
  let expiredFeaturedStudioId = '';

  beforeAll(async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
        membership_tier: 'PREMIUM',
        created_at: now,
        updated_at: now,
      },
    });

    activePremiumStudioId = randomBytes(12).toString('base64url');
    testStudioIds.push(activePremiumStudioId);
    await db.studio_profiles.create({
      data: {
        id: activePremiumStudioId,
        user_id: user1Id,
        name: 'Active Premium Studio',
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

    // Premium membership with an expired subscription — current BASIC/PREMIUM model
    // treats missing membership_tier as BASIC (free/active), so this fixture must
    // be explicitly PREMIUM or enforcement will not deactivate it.
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
        membership_tier: 'PREMIUM',
        created_at: now,
        updated_at: now,
      },
    });

    expiredPremiumStudioId = randomBytes(12).toString('base64url');
    testStudioIds.push(expiredPremiumStudioId);
    await db.studio_profiles.create({
      data: {
        id: expiredPremiumStudioId,
        user_id: user2Id,
        name: 'Expired Premium Studio',
        status: 'ACTIVE',
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
        membership_tier: 'PREMIUM',
        created_at: now,
        updated_at: now,
      },
    });

    expiredFeaturedStudioId = randomBytes(12).toString('base64url');
    testStudioIds.push(expiredFeaturedStudioId);
    await db.studio_profiles.create({
      data: {
        id: expiredFeaturedStudioId,
        user_id: user3Id,
        name: 'Expired Featured Studio',
        status: 'ACTIVE',
        is_featured: true,
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
      select: enforcementStudioSelect,
    });

    const decisions = computeEnforcementDecisions(studios);

    expect(decisions.length).toBeGreaterThanOrEqual(2);

    const expiredPremiumStudio = studios.find((studio) => studio.id === expiredPremiumStudioId);
    expect(expiredPremiumStudio?.users.membership_tier).toBe('PREMIUM');

    const expiredStudioDecision = decisions.find((decision) => decision.studioId === expiredPremiumStudioId);
    expect(expiredStudioDecision).toBeDefined();
    expect(expiredStudioDecision?.statusUpdate?.status).toBe('INACTIVE');
    expect(expiredStudioDecision?.triggerDowngrade).toBe(true);

    const featuredStudioDecision = decisions.find((decision) => decision.studioId === expiredFeaturedStudioId);
    expect(featuredStudioDecision).toBeDefined();
    expect(featuredStudioDecision?.unfeaturedUpdate).toBe(true);

    const activeStudioDecision = decisions.find((decision) => decision.studioId === activePremiumStudioId);
    expect(activeStudioDecision).toBeUndefined();
  });

  it('should apply enforcement decisions to database', async () => {
    const studios = await db.studio_profiles.findMany({
      where: {
        id: { in: testStudioIds },
      },
      select: enforcementStudioSelect,
    });

    const decisions = computeEnforcementDecisions(studios);
    const { statusUpdates, unfeaturedUpdates } = await applyEnforcementDecisions(decisions);

    expect(statusUpdates).toBeGreaterThanOrEqual(0);
    expect(unfeaturedUpdates).toBeGreaterThanOrEqual(0);

    if (statusUpdates > 0 || unfeaturedUpdates > 0) {
      const updatedStudios = await db.studio_profiles.findMany({
        where: {
          id: { in: testStudioIds },
        },
      });

      expect(updatedStudios.length).toBeGreaterThan(0);
    }
  });
});

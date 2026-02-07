import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeEnforcementDecisions, applyEnforcementDecisions } from '@/lib/subscriptions/enforcement';

/**
 * Cron endpoint to enforce subscription and featured status
 * 
 * This endpoint can be called by a cron service to periodically check and enforce:
 * - Studio status (ACTIVE/INACTIVE) based on membership expiry
 * - Featured status based on featured_until expiry
 * 
 * NOT SCHEDULED - Must be manually configured in cron service/scheduler
 * 
 * Usage:
 *   POST /api/cron/check-subscriptions
 *   Header: X-Cron-Secret: <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('x-cron-secret');
    if (authHeader !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    // Fetch all studios with necessary fields for enforcement
    const studios = await db.studio_profiles.findMany({
      select: {
        id: true,
        status: true,
        is_featured: true,
        featured_until: true,
        users: {
          select: {
            email: true,
            membership_tier: true,
            subscriptions: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                current_period_end: true,
              }
            }
          }
        }
      }
    });

    // Compute enforcement decisions
    const decisions = computeEnforcementDecisions(studios);

    // Apply decisions
    const { statusUpdates, unfeaturedUpdates } = await applyEnforcementDecisions(decisions);

    return NextResponse.json({
      success: true,
      summary: {
        total_studios: studios.length,
        status_updates: statusUpdates,
        unfeatured_updates: unfeaturedUpdates,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Subscription enforcement error:', error);
    return NextResponse.json(
      {
        error: 'Subscription enforcement failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing (requires secret)
export async function GET(request: NextRequest) {
  return POST(request);
}

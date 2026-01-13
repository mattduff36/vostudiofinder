import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';

/**
 * Admin API: Error Log Group Details
 * 
 * GET: Fetch full details including sample event JSON for a specific error log group
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    await requireApiRole(Role.ADMIN);

    const { id } = await params;

    // Fetch error log group with full details
    const errorLogGroup = await db.error_log_groups.findUnique({
      where: { id },
      select: {
        id: true,
        sentry_issue_id: true,
        title: true,
        level: true,
        status: true,
        first_seen_at: true,
        last_seen_at: true,
        event_count: true,
        environment: true,
        release: true,
        last_event_id: true,
        sample_event_json: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!errorLogGroup) {
      return NextResponse.json(
        { error: 'Error log group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      errorLogGroup,
    });
  } catch (error) {
    console.error('[ERROR_LOG_API] Error fetching error log details:', error);
    
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch error log details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth-guards';
import { Prisma, Role } from '@prisma/client';
import { db } from '@/lib/db';

/**
 * Admin API: Error Log Groups
 * 
 * GET: List error log groups with filtering and pagination
 * PATCH: Update error log group status (for triage)
 */

export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireApiRole(Role.ADMIN);

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status'); // OPEN, RESOLVED, IGNORED, or ALL
    const level = searchParams.get('level'); // error, fatal, warning, info, or ALL
    const search = searchParams.get('search'); // Search in title
    const dateFrom = searchParams.get('dateFrom'); // ISO date string
    const dateTo = searchParams.get('dateTo'); // ISO date string
    const sortBy = searchParams.get('sortBy') || 'last_seen_at'; // last_seen_at, event_count, first_seen_at
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // asc or desc

    // Build where clause
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (level && level !== 'ALL') {
      where.level = level;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (dateFrom || dateTo) {
      where.last_seen_at = {};
      if (dateFrom) {
        where.last_seen_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.last_seen_at.lte = new Date(dateTo);
      }
    }

    // Fetch error log groups
    const [errorLogGroups, totalCount] = await Promise.all([
      db.error_log_groups.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
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
          created_at: true,
          updated_at: true,
          // Don't include sample_event_json in list view for performance
        },
      }),
      db.error_log_groups.count({ where }),
    ]);

    return NextResponse.json({
      errorLogGroups,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[ERROR_LOG_API] Error fetching error logs:', error);
    
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch error logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Require admin role
    await requireApiRole(Role.ADMIN);

    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Error log group ID is required' },
        { status: 400 }
      );
    }

    if (!status || !['OPEN', 'RESOLVED', 'IGNORED'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (OPEN, RESOLVED, or IGNORED)' },
        { status: 400 }
      );
    }

    // Update error log group status
    const errorLogGroup = await db.error_log_groups.update({
      where: { id },
      data: {
        status,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      errorLogGroup,
    });
  } catch (error) {
    console.error('[ERROR_LOG_API] Error updating error log:', error);
    
    if (error instanceof Error && error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Error log group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update error log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { AuditClassification } from '@prisma/client';

/**
 * GET /api/admin/audit/users
 * 
 * List all audit findings with filtering and pagination
 * 
 * Query params:
 * - classification: filter by classification (JUNK, NEEDS_UPDATE, NOT_ADVERTISING, EXCEPTION, HEALTHY)
 * - minScore: minimum completeness score
 * - maxScore: maximum completeness score
 * - hasStudio: true/false to filter by studio profile existence
 * - limit: number of results (default 50)
 * - offset: pagination offset (default 0)
 * - sortBy: field to sort by (default created_at)
 * - sortOrder: asc/desc (default desc)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classification = searchParams.get('classification') as AuditClassification | null;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined;
    const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined;
    const hasStudio = searchParams.get('hasStudio');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};

    if (classification) {
      where.classification = classification;
    }

    if (minScore !== undefined || maxScore !== undefined) {
      where.completeness_score = {};
      if (minScore !== undefined) where.completeness_score.gte = minScore;
      if (maxScore !== undefined) where.completeness_score.lte = maxScore;
    }

    if (hasStudio === 'true') {
      where.studio_profile_id = { not: null };
    } else if (hasStudio === 'false') {
      where.studio_profile_id = null;
    }

    if (search) {
      where.OR = [
        { users: { username: { contains: search, mode: 'insensitive' } } },
        { users: { email: { contains: search, mode: 'insensitive' } } },
        { users: { display_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy
    const validSortFields: Record<string, any> = {
      created_at: { created_at: sortOrder },
      completeness_score: { completeness_score: sortOrder },
      classification: { classification: sortOrder },
      username: { users: { username: sortOrder } },
    };

    const orderBy = validSortFields[sortBy] || { created_at: sortOrder };

    // Fetch findings with related data
    const [findings, total] = await Promise.all([
      db.profile_audit_findings.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              display_name: true,
              status: true,
              created_at: true,
              last_login: true,
            }
          },
          studio_profiles: {
            select: {
              id: true,
              name: true,
              city: true,
              status: true,
              is_profile_visible: true,
              updated_at: true,
            }
          },
          enrichment_suggestions: {
            where: {
              status: 'PENDING',
            },
            select: {
              id: true,
              field_name: true,
              confidence: true,
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.profile_audit_findings.count({ where })
    ]);

    // Get summary statistics
    const summary = await db.profile_audit_findings.groupBy({
      by: ['classification'],
      _count: {
        id: true,
      },
    });

    const summaryMap = summary.reduce((acc, item) => {
      acc[item.classification] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      findings,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary: summaryMap,
    });

  } catch (error) {
    console.error('Admin audit users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

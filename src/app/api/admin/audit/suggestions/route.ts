import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { SuggestionStatus, EnrichmentConfidence, Prisma } from '@prisma/client';

/**
 * GET /api/admin/audit/suggestions
 * 
 * List enrichment suggestions with filtering
 * 
 * Query params:
 * - findingId: filter by audit finding ID
 * - status: PENDING, APPROVED, REJECTED, APPLIED
 * - confidence: HIGH, MEDIUM, LOW
 * - fieldName: filter by field name
 * - limit: number of results (default 100)
 * - offset: pagination offset (default 0)
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
    const findingId = searchParams.get('findingId');
    const status = searchParams.get('status') as SuggestionStatus | null;
    const confidence = searchParams.get('confidence') as EnrichmentConfidence | null;
    const fieldName = searchParams.get('fieldName');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    if (findingId) where.audit_finding_id = findingId;
    if (status) where.status = status;
    if (confidence) where.confidence = confidence;
    if (fieldName) where.field_name = fieldName;

    // Fetch suggestions with related data
    const [suggestions, total] = await Promise.all([
      db.profile_enrichment_suggestions.findMany({
        where,
        include: {
          audit_finding: {
            include: {
              users: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  display_name: true,
                }
              },
              studio_profiles: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          reviewed_by: {
            select: {
              id: true,
              username: true,
              email: true,
            }
          }
        },
        orderBy: [
          { confidence: 'desc' }, // High confidence first
          { created_at: 'desc' }
        ],
        take: limit,
        skip: offset,
      }),
      db.profile_enrichment_suggestions.count({ where })
    ]);

    return NextResponse.json({
      suggestions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Admin audit suggestions GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/audit/suggestions
 * 
 * Approve or reject suggestions
 * 
 * Body:
 * {
 *   suggestionIds: string[],
 *   action: 'APPROVE' | 'REJECT'
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { suggestionIds, action } = body;

    if (!suggestionIds || !Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return NextResponse.json(
        { error: 'suggestionIds array is required' },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const newStatus: SuggestionStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // Update suggestions
    const result = await db.profile_enrichment_suggestions.updateMany({
      where: {
        id: { in: suggestionIds },
        status: 'PENDING', // Only update pending suggestions
      },
      data: {
        status: newStatus,
        reviewed_by_id: session.user.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      action,
    });

  } catch (error) {
    console.error('Admin audit suggestions PATCH API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/audit/suggestions
 * 
 * Apply approved suggestions to profiles
 * 
 * Body:
 * {
 *   suggestionIds: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { suggestionIds } = body;

    if (!suggestionIds || !Array.isArray(suggestionIds) || suggestionIds.length === 0) {
      return NextResponse.json(
        { error: 'suggestionIds array is required' },
        { status: 400 }
      );
    }

    // Fetch approved suggestions only
    const suggestions = await db.profile_enrichment_suggestions.findMany({
      where: {
        id: { in: suggestionIds },
        status: 'APPROVED',
      },
      include: {
        audit_finding: {
          include: {
            users: true,
            studio_profiles: true,
          }
        }
      }
    });

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: 'No approved suggestions found' },
        { status: 400 }
      );
    }

    // Allowlisted fields that can be safely updated
    const allowlistedStudioFields = [
      'website_url',
      'facebook_url',
      'twitter_url',
      'x_url',
      'linkedin_url',
      'instagram_url',
      'youtube_url',
      'vimeo_url',
      'soundcloud_url',
      'tiktok_url',
      'threads_url',
      'phone',
      'city',
      'abbreviated_address',
    ];

    const allowlistedUserFields: string[] = [
      // Currently none - could add avatar_url if needed
    ];

    let appliedCount = 0;
    const errors: string[] = [];

    // Apply each suggestion
    for (const suggestion of suggestions) {
      try {
        const finding = suggestion.audit_finding;
        const studioProfile = finding.studio_profiles;
        const user = finding.users;

        // Determine if this is a studio field or user field
        const isStudioField = allowlistedStudioFields.includes(suggestion.field_name);
        const isUserField = allowlistedUserFields.includes(suggestion.field_name);

        if (!isStudioField && !isUserField) {
          errors.push(`Field ${suggestion.field_name} is not allowlisted for updates`);
          continue;
        }

        // Store before/after in audit log
        const oldValue = isStudioField 
          ? (studioProfile as any)?.[suggestion.field_name]
          : (user as any)?.[suggestion.field_name];

        // Apply the update
        if (isStudioField && studioProfile) {
          await db.studio_profiles.update({
            where: { id: studioProfile.id },
            data: {
              [suggestion.field_name]: suggestion.suggested_value,
              updated_at: new Date(),
            }
          });
        } else if (isUserField) {
          await db.users.update({
            where: { id: user.id },
            data: {
              [suggestion.field_name]: suggestion.suggested_value,
              updated_at: new Date(),
            }
          });
        }

        // Log the change
        await db.profile_audit_log.create({
          data: {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            suggestion_id: suggestion.id,
            user_id: user.id,
            studio_profile_id: studioProfile?.id || null,
            action: 'FIELD_UPDATE',
            field_name: suggestion.field_name,
            old_value: oldValue || null,
            new_value: suggestion.suggested_value,
            evidence_url: suggestion.evidence_url,
            performed_by_id: session.user.id,
            notes: `Applied enrichment suggestion (${suggestion.confidence} confidence)`,
          }
        });

        // Mark suggestion as applied
        await db.profile_enrichment_suggestions.update({
          where: { id: suggestion.id },
          data: {
            status: 'APPLIED',
            applied_at: new Date(),
            updated_at: new Date(),
          }
        });

        appliedCount++;

      } catch (error: any) {
        errors.push(`Failed to apply suggestion ${suggestion.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      applied: appliedCount,
      total: suggestions.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Admin audit suggestions POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

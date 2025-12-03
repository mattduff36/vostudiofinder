import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const reportSchema = z.object({
  contentType: z.enum(['review', 'message', 'studio', 'user']),
  contentId: z.string(),
  reportedUserId: z.string().optional(),
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'inappropriate', 'fake_info', 'copyright', 'other']),
  customReason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contentType, contentId, reportedUserId, reason, customReason } = reportSchema.parse(body);

    // Check if user has already reported this content
    const existingReport = await db.content_reports.findFirst({
      where: {
        reporter_id: session.user.id,
        content_type: contentType.toUpperCase() as any,
        content_id: contentId,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 400 }
      );
    }

    // Create the report
    const report = await db.content_reports.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        reporter_id: session.user.id,
        content_type: contentType.toUpperCase() as any,
        content_id: contentId,
        reported_user_id: reportedUserId || null,
        reason: reason.toUpperCase() as any,
        custom_reason: reason === 'other' ? (customReason || null) : null,
        status: 'PENDING',
        updated_at: new Date(),
      },
    });

    // FUTURE: Notify moderation team
    // await NotificationService.notifyModerationTeam(report);

    return NextResponse.json({
      success: true,
      reportId: report.id,
    });
  } catch (error) {
    console.error('Error creating report:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'REVIEWED' | 'RESOLVED' | null;
    const contentType = searchParams.get('contentType') as 'REVIEW' | 'MESSAGE' | 'STUDIO' | 'USER' | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (contentType) where.content_type = contentType;

    const [reports, totalCount] = await Promise.all([
      db.content_reports.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          users_content_reports_reporter_idTousers: {
            select: {
              id: true,
              display_name: true,
              username: true,
              email: true,
            },
          },
          users_content_reports_reported_user_idTousers: {
            select: {
              id: true,
              display_name: true,
              username: true,
              email: true,
            },
          },
          users_content_reports_reviewed_by_idTousers: {
            select: {
              id: true,
              display_name: true,
              username: true,
            },
          },
        },
      }),
      db.content_reports.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}


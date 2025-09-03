import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

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
    const existingReport = await db.contentReport.findFirst({
      where: {
        reporterId: session.user.id,
        contentType: contentType.toUpperCase() as any,
        contentId,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 400 }
      );
    }

    // Create the report
    const report = await db.contentReport.create({
      data: {
        reporterId: session.user.id,
        contentType: contentType.toUpperCase() as any,
        contentId,
        reportedUserId,
        reason: reason.toUpperCase() as any,
        customReason: reason === 'other' ? customReason : undefined,
        status: 'PENDING',
      },
    });

    // TODO: Notify moderation team
    // await NotificationService.notifyModerationTeam(report);

    return NextResponse.json({
      success: true,
      reportId: report.id,
    });
  } catch (error) {
    console.error('Error creating report:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
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
    if (contentType) where.contentType = contentType;

    const [reports, totalCount] = await Promise.all([
      db.contentReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              displayName: true,
              username: true,
              email: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              displayName: true,
              username: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
        },
      }),
      db.contentReport.count({ where }),
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

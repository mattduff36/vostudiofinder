import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { nanoid } from 'nanoid';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';

const MAX_CONTENT_LENGTH = 10000; // 10k chars limit

/**
 * GET /api/admin/sticky-notes
 * Returns the global admin sticky note
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy';
    if (!session?.user || !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch or create the global note
    let note = await db.admin_sticky_notes.findUnique({
      where: { key: 'global' }
    });

    // If doesn't exist, create with empty content
    if (!note) {
      note = await db.admin_sticky_notes.create({
        data: {
          id: nanoid(),
          key: 'global',
          content: '',
        }
      });
    }

    return NextResponse.json({
      content: note.content,
      updatedAt: note.updated_at.toISOString()
    });

  } catch (error) {
    console.error('Error fetching admin sticky note:', error);
    await handleApiError(error, request);
    return NextResponse.json(
      { error: 'Failed to fetch sticky note' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/sticky-notes
 * Updates the global admin sticky note
 */
export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy';
    if (!session?.user || !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    // Validate content
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content must be less than ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Upsert the note
    const note = await db.admin_sticky_notes.upsert({
      where: { key: 'global' },
      update: {
        content,
        updated_at: new Date()
      },
      create: {
        id: nanoid(),
        key: 'global',
        content,
      }
    });

    return NextResponse.json({
      content: note.content,
      updatedAt: note.updated_at.toISOString()
    });

  } catch (error) {
    console.error('Error saving admin sticky note:', error);
    await handleApiError(error, request);
    return NextResponse.json(
      { error: 'Failed to save sticky note' },
      { status: 500 }
    );
  }
}

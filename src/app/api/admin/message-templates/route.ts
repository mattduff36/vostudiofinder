import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === 'ADMIN' ||
      session?.user?.email === 'admin@mpdee.co.uk' ||
      session?.user?.username === 'VoiceoverGuy';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await db.admin_message_templates.findMany({
      orderBy: { sort_order: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching admin message templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === 'ADMIN' ||
      session?.user?.email === 'admin@mpdee.co.uk' ||
      session?.user?.username === 'VoiceoverGuy';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { label, body: templateBody } = body;

    if (!label?.trim() || !templateBody?.trim()) {
      return NextResponse.json(
        { error: 'Label and body are required' },
        { status: 400 }
      );
    }

    const last = await db.admin_message_templates.findFirst({
      orderBy: { sort_order: 'desc' },
    });

    const template = await db.admin_message_templates.create({
      data: {
        label: label.trim(),
        body: templateBody.trim(),
        sort_order: (last?.sort_order ?? 0) + 1,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error creating admin message template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

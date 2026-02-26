import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === 'ADMIN' ||
      session?.user?.email === 'admin@mpdee.co.uk' ||
      session?.user?.username === 'VoiceoverGuy';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, body: templateBody, sort_order } = body;

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label.trim();
    if (templateBody !== undefined) updateData.body = templateBody.trim();
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const template = await db.admin_message_templates.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error updating admin message template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === 'ADMIN' ||
      session?.user?.email === 'admin@mpdee.co.uk' ||
      session?.user?.username === 'VoiceoverGuy';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await db.admin_message_templates.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin message template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

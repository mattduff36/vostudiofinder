import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messageTemplateFields } from '@/lib/admin/content-validation';
import { parseContent, contentError } from '@/lib/admin/content-api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: session?.user ? 403 : 401 });
    }

    const { id } = await params;
    const updateData = await parseContent(request, messageTemplateFields.partial().strict().refine(value => Object.keys(value).length > 0));

    const template = await db.admin_message_templates.update({
      where: { id },
      data: { ...(updateData.label !== undefined ? { label: updateData.label } : {}), ...(updateData.body !== undefined ? { body: updateData.body } : {}) },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    return contentError(error, 'Failed to update template');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: session?.user ? 403 : 401 });
    }

    const { id } = await params;

    await db.admin_message_templates.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return contentError(error, 'Failed to delete template');
  }
}

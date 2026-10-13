import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { messageTemplateFields } from '@/lib/admin/content-validation';
import { parseContent, contentError } from '@/lib/admin/content-api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: session?.user ? 403 : 401 });
    }

    const templates = await db.admin_message_templates.findMany({
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return contentError(error, 'Failed to fetch templates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: session?.user ? 403 : 401 });
    }

    const { label, body: templateBody } = await parseContent(request, messageTemplateFields.strict());

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
    return contentError(error, 'Failed to create template');
  }
}

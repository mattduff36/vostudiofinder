import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { faqFields } from '@/lib/admin/content-validation';
import { parseContent, contentError } from '@/lib/admin/content-api';

// PATCH - Update FAQ (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const input = await parseContent(request, faqFields.omit({ sort_order: true }).partial().strict().refine(value => Object.keys(value).length > 0));
    const faq = await db.faq.update({ where: { id }, data: { ...(input.question !== undefined ? { question: input.question } : {}), ...(input.answer !== undefined ? { answer: input.answer } : {}), updated_at: new Date() } });

    return NextResponse.json({ 
      success: true, 
      faq,
      message: 'FAQ updated successfully'
    });
  } catch (error) {
    return contentError(error, 'Failed to update FAQ');
  }
}

// DELETE - Delete FAQ (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(44657829)`;
      await tx.faq.delete({ where: { id } });
    });

    return NextResponse.json({ 
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    return contentError(error, 'Failed to delete FAQ');
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { faqReorderInput } from '@/lib/admin/content-validation';
import { parseContent, ContentError, contentError } from '@/lib/admin/content-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: session ? 403 : 401 });
    const input = await parseContent(request, faqReorderInput);
    const faqs = await db.$transaction(async tx => {
      // Create, delete and reorder share this lock, including an empty FAQ list.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(44657829)`;
      const current = await tx.faq.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });
      if (current.length !== input.expectedOrder.length || current.some((faq, index) => faq.id !== input.expectedOrder[index])) {
        throw new ContentError('The FAQ list changed. Reload it before reordering.', 409);
      }
      for (const faq of input.faqs) await tx.faq.update({ where: { id: faq.id }, data: { sort_order: faq.sort_order, updated_at: new Date() } });
      return tx.faq.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });
    });
    return NextResponse.json({ success: true, faqs });
  } catch (error) { return contentError(error, 'Failed to reorder FAQs'); }
}

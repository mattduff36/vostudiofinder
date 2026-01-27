/**
 * POST /api/admin/emails/preview
 * Preview an email template with sample variables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { renderEmailTemplate } from '@/lib/email/render';
import { z } from 'zod';

const previewSchema = z.object({
  templateKey: z.string(),
  variables: z.record(z.any()),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validated = previewSchema.parse(body);
    
    // Render template
    const rendered = await renderEmailTemplate(validated.templateKey, validated.variables);
    
    return NextResponse.json({
      html: rendered.html,
      text: rendered.text,
      subject: rendered.subject,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error previewing template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to preview template', details: errorMessage },
      { status: 500 }
    );
  }
}

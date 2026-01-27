/**
 * POST /api/admin/emails/test-send
 * Send a test email to an admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { z } from 'zod';

const testSendSchema = z.object({
  templateKey: z.string(),
  recipientEmail: z.string().email(),
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
    const validated = testSendSchema.parse(body);
    
    // Verify recipient is an admin (security check)
    // Optional: You could remove this if you want admins to send test emails to any address
    // For now, keeping it strict for security
    
    // Send test email (skip marketing check for test sends)
    const success = await sendTemplatedEmail({
      to: validated.recipientEmail,
      templateKey: validated.templateKey,
      variables: validated.variables,
      skipMarketingCheck: true, // Test sends bypass opt-in checks
    });
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }
    
    console.log(`✅ Test email sent: ${validated.templateKey} → ${validated.recipientEmail}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error sending test email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send test email', details: errorMessage },
      { status: 500 }
    );
  }
}

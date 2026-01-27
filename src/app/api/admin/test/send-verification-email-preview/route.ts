import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email/email-service';
import { generateVerificationRequestEmail } from '@/lib/email/templates/verification-request';
import { getBaseUrl } from '@/lib/seo/site';

/**
 * POST /api/admin/test/send-verification-email-preview
 * Admin-only endpoint to send a sample verification request email to admin@mpdee.co.uk for review
 * 
 * This is a TEST-ONLY endpoint for previewing email templates.
 * It sends a sample email with dummy data to admin@mpdee.co.uk.
 * 
 * Requirements:
 * - User must be an ADMIN
 */
export async function POST(_request: NextRequest) {
  try {
    // Verify authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Sample data for testing
    const baseUrl = getBaseUrl();
    const { html, text, subject } = generateVerificationRequestEmail({
      studioOwnerName: 'John Smith',
      studioName: 'Premium Voice Studio',
      username: 'johnsmith',
      email: 'john@example.com',
      profileCompletion: 92,
      studioUrl: `${baseUrl}/johnsmith`,
      adminDashboardUrl: `${baseUrl}/admin`,
    });

    // Send preview email to admin@mpdee.co.uk
    const success = await sendEmail({
      to: 'admin@mpdee.co.uk',
      subject: `[TEST PREVIEW] ${subject}`,
      html,
      text,
      replyTo: 'john@example.com',
    });

    if (!success) {
      console.error('❌ Failed to send preview email to admin@mpdee.co.uk');
      return NextResponse.json(
        { error: 'Failed to send preview email' },
        { status: 500 }
      );
    }

    console.log('✅ Verification request preview email sent to admin@mpdee.co.uk');

    return NextResponse.json({
      success: true,
      message: 'Preview email sent to admin@mpdee.co.uk',
      recipient: 'admin@mpdee.co.uk',
    });

  } catch (error) {
    console.error('[Verification Email Preview] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send preview email' },
      { status: 500 }
    );
  }
}

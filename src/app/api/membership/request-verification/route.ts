import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email/email-service';
import { generateVerificationRequestEmail } from '@/lib/email/templates/verification-request';
import { getBaseUrl } from '@/lib/seo/site';

/**
 * POST /api/membership/request-verification
 * Request verified badge for studio profile
 * 
 * Requirements:
 * - Profile must be at least 85% complete
 * - User must have an active membership
 * - Studio must not already be verified
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Fetch user with studio and profile data
    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        studios: {
          select: {
            id: true,
            studio_name: true,
            is_verified: true,
          },
        },
        subscriptions: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a studio
    if (!user.studios) {
      return NextResponse.json(
        { error: 'No studio found for this user' },
        { status: 400 }
      );
    }

    // Check if studio is already verified
    if (user.studios.is_verified) {
      return NextResponse.json(
        { error: 'Studio is already verified' },
        { status: 400 }
      );
    }

    // Check if user has an active membership
    if (!user.subscriptions || user.subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Active membership required to request verification' },
        { status: 403 }
      );
    }

    // Calculate profile completion percentage
    // This logic should match the completion calculation in Settings.tsx
    const studio = user.studios;
    let completedFields = 0;
    let totalFields = 0;

    // Basic Info (6 fields)
    totalFields += 6;
    if (studio.studio_name) completedFields++;
    if (user.display_name) completedFields++;
    if (user.bio) completedFields++;
    if (user.location) completedFields++;
    if (user.website) completedFields++;
    if (user.email) completedFields++;

    // Get additional studio data for better completion check
    const fullStudio = await db.studios.findUnique({
      where: { id: studio.id },
      include: {
        studio_images: true,
        studio_equipment: true,
      },
    });

    if (!fullStudio) {
      return NextResponse.json(
        { error: 'Studio data not found' },
        { status: 404 }
      );
    }

    // Equipment (estimate 5 fields)
    totalFields += 5;
    if (fullStudio.studio_equipment && fullStudio.studio_equipment.length > 0) {
      completedFields += Math.min(fullStudio.studio_equipment.length, 5);
    }

    // Images (at least 1 image)
    totalFields += 1;
    if (fullStudio.studio_images && fullStudio.studio_images.length > 0) {
      completedFields++;
    }

    // Additional fields
    totalFields += 3;
    if (fullStudio.description) completedFields++;
    if (fullStudio.services) completedFields++;
    if (fullStudio.address) completedFields++;

    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    // Check if profile is at least 85% complete
    if (completionPercentage < 85) {
      return NextResponse.json(
        { 
          error: 'Profile must be at least 85% complete to request verification',
          currentCompletion: completionPercentage
        },
        { status: 403 }
      );
    }

    // Get all admin users
    const adminUsers = await db.users.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    const adminEmails = adminUsers.map(admin => admin.email).filter(email => email);
    
    // Add support email
    const recipientEmails = [...adminEmails, 'support@voiceoverstudiofinder.com'];

    if (recipientEmails.length === 0) {
      console.error('[Verification Request] No admin emails found');
      return NextResponse.json(
        { error: 'Unable to process request. Please contact support.' },
        { status: 500 }
      );
    }

    // Generate email content
    const baseUrl = getBaseUrl();
    const { html, text, subject } = generateVerificationRequestEmail({
      studioOwnerName: user.display_name || user.username || 'Studio Owner',
      studioName: studio.studio_name,
      username: user.username,
      email: user.email,
      profileCompletion: completionPercentage,
      studioUrl: `${baseUrl}/${user.username}`,
      adminDashboardUrl: `${baseUrl}/admin`,
    });

    // Send email to all recipients
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const recipientEmail of recipientEmails) {
      try {
        const success = await sendEmail({
          to: recipientEmail,
          subject,
          html,
          text,
          replyTo: user.email, // Allow admins to reply directly to the user
        });

        if (success) {
          emailsSent++;
          console.log(`✅ Verification request email sent to ${recipientEmail}`);
        } else {
          emailsFailed++;
          console.error(`❌ Failed to send verification request email to ${recipientEmail}`);
        }
      } catch (error) {
        emailsFailed++;
        console.error(`❌ Error sending verification request email to ${recipientEmail}:`, error);
      }
    }

    // Also send a copy to admin@mpdee.co.uk for review (per user's request)
    try {
      await sendEmail({
        to: 'admin@mpdee.co.uk',
        subject: `[Review Required] ${subject}`,
        html,
        text,
        replyTo: user.email,
      });
      console.log('✅ Verification request email sent to admin@mpdee.co.uk for review');
    } catch (error) {
      console.error('❌ Failed to send verification request email to admin@mpdee.co.uk:', error);
    }

    if (emailsSent === 0) {
      return NextResponse.json(
        { error: 'Failed to send verification request emails' },
        { status: 500 }
      );
    }

    console.log(`✅ Verification request submitted for ${user.username} (${emailsSent}/${recipientEmails.length} emails sent)`);

    return NextResponse.json({
      success: true,
      message: 'Verification request submitted successfully',
      emailsSent,
      emailsFailed,
    });

  } catch (error) {
    console.error('[Verification Request] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process verification request' },
      { status: 500 }
    );
  }
}

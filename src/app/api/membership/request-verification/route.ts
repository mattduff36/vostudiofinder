import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendTemplatedEmail } from '@/lib/email/send-templated';
import { getBaseUrl } from '@/lib/seo/site';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';

/**
 * POST /api/membership/request-verification
 * Request verified badge for studio profile
 * 
 * Requirements:
 * - Profile must be at least 85% complete
 * - User must have an active membership
 * - Studio must not already be verified
 */
export async function POST(_request: NextRequest) {
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

    // Fetch user with studio profile and membership data
    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        studio_profiles: {
          include: {
            studio_studio_types: {
              select: { studio_type: true },
            },
            studio_images: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const studio = user.studio_profiles;
    if (!studio) {
      return NextResponse.json(
        { error: 'No studio found for this user' },
        { status: 400 }
      );
    }

    // Check if studio is already verified
    if (studio.is_verified) {
      return NextResponse.json(
        { error: 'Studio is already verified' },
        { status: 400 }
      );
    }

    // Check if user has Premium membership (verification is Premium-only)
    const { requirePremiumMembership } = await import('@/lib/membership');
    const premiumCheck = await requirePremiumMembership(userId);
    if (premiumCheck.error) {
      return NextResponse.json(
        { error: premiumCheck.error },
        { status: premiumCheck.status || 403 }
      );
    }

    // Calculate profile completion percentage (shared logic)
    const completionStats = calculateCompletionStats({
      user: {
        username: user.username || '',
        display_name: user.display_name || '',
        email: user.email,
        avatar_url: user.avatar_url,
      },
      profile: {
        short_about: studio.short_about,
        about: studio.about,
        phone: studio.phone,
        location: studio.location,
        website_url: studio.website_url,
        connection1: studio.connection1,
        connection2: studio.connection2,
        connection3: studio.connection3,
        connection4: studio.connection4,
        connection5: studio.connection5,
        connection6: studio.connection6,
        connection7: studio.connection7,
        connection8: studio.connection8,
        connection9: studio.connection9,
        connection10: studio.connection10,
        connection11: studio.connection11,
        connection12: studio.connection12,
        rate_tier_1: studio.rate_tier_1,
        equipment_list: studio.equipment_list,
        services_offered: studio.services_offered,
        facebook_url: studio.facebook_url,
        x_url: studio.x_url,
        linkedin_url: studio.linkedin_url,
        instagram_url: studio.instagram_url,
        youtube_url: studio.youtube_url,
        tiktok_url: studio.tiktok_url,
        threads_url: studio.threads_url,
        soundcloud_url: studio.soundcloud_url,
        vimeo_url: studio.vimeo_url,
        bluesky_url: studio.bluesky_url,
      },
      studio: {
        name: studio.name,
        studio_types: studio.studio_studio_types?.map((st) => st.studio_type) || [],
        images: studio.studio_images || [],
        website_url: studio.website_url,
      },
    });

    const completionPercentage = completionStats.overall.percentage;

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
    
    // Send email to all recipients
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const recipientEmail of recipientEmails) {
      try {
        const success = await sendTemplatedEmail({
          to: recipientEmail,
          templateKey: 'verification-request',
          variables: {
            studioOwnerName: user.display_name || user.username || 'Studio Owner',
            studioName: studio.name,
            username: user.username,
            email: user.email,
            profileCompletion: completionPercentage,
            studioUrl: `${baseUrl}/${user.username}`,
            adminDashboardUrl: `${baseUrl}/admin`,
          },
          replyToOverride: user.email, // Allow admins to reply directly to the user
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

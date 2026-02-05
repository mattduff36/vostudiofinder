import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { getBaseUrl } from '@/lib/seo/site';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';
import { authOptions } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * POST /api/featured/create-checkout
 * Create Stripe checkout session for Featured Studio Upgrade (6 months)
 * 
 * Server-side eligibility checks:
 * - User must be authenticated
 * - Profile must be 100% complete
 * - Membership must be ACTIVE (not expired)
 * - Studio must not already be featured (or featured status has expired)
 * - Available featured slots (< 6 total featured studios)
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

    // Fetch user with studio profile and subscription
    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        studio_profiles: {
          include: {
            studio_studio_types: {
              select: {
                studio_type: true,
              },
            },
            studio_images: true,
          },
        },
        subscriptions: {
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

    const studio = user.studio_profiles;
    if (!studio) {
      return NextResponse.json(
        { error: 'No studio profile found' },
        { status: 400 }
      );
    }

    // Check 1: Must be Premium tier with active membership
    const { requirePremiumMembership } = await import('@/lib/membership');
    const premiumCheck = await requirePremiumMembership(userId);
    if (premiumCheck.error) {
      return NextResponse.json(
        { error: premiumCheck.error },
        { status: premiumCheck.status || 403 }
      );
    }

    const now = new Date();

    // Check 2: Profile must be 100% complete
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
      },
      studio: {
        name: studio.name,
        studio_types: studio.studio_studio_types?.map(st => st.studio_type) || [],
        images: studio.studio_images || [],
        website_url: studio.website_url,
      },
    });

    if (completionStats.overall.percentage < 100) {
      return NextResponse.json(
        { 
          error: 'Profile must be 100% complete to become a featured studio.',
          completionPercentage: completionStats.overall.percentage,
          requiredFieldsCompleted: completionStats.required.completed,
          requiredFieldsTotal: completionStats.required.total,
        },
        { status: 400 }
      );
    }

    // Check 3: Studio must not already be featured (or featured has expired)
    if (studio.is_featured) {
      // Check if featured status has expired
      if (!studio.featured_until || studio.featured_until >= now) {
        // Still featured and not expired
        const expiryDate = studio.featured_until 
          ? studio.featured_until.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })
          : 'indefinitely';
        
        return NextResponse.json(
          { 
            error: `Your studio is already featured until ${expiryDate}.`,
            isFeatured: true,
            featuredUntil: studio.featured_until?.toISOString() || null,
          },
          { status: 400 }
        );
      }
    }

    // Check 4: Available featured slots (< 6 total)
    const featuredCount = await db.studio_profiles.count({
      where: {
        is_featured: true,
        OR: [
          { featured_until: null },
          { featured_until: { gte: now } }
        ]
      }
    });

    if (featuredCount >= 6) {
      return NextResponse.json(
        { 
          error: 'All featured studio slots are currently taken. Please try again later.',
          featuredCount,
          maxFeatured: 6,
        },
        { status: 400 }
      );
    }

    // Get 6-month featured price ID from environment
    const priceId = process.env.STRIPE_6MONTH_FEATURED_STUDIO_PRICE_ID;
    if (!priceId) {
      console.error('STRIPE_6MONTH_FEATURED_STUDIO_PRICE_ID not configured');
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const baseUrl = getBaseUrl(request);
    const stripeSession = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: `${baseUrl}/dashboard?tab=settings&section=membership&featured=success`,
      metadata: {
        user_id: userId,
        user_email: user.email,
        studio_id: studio.id,
        purpose: 'featured_upgrade',
      },
      payment_intent_data: {
        metadata: {
          user_id: userId,
          user_email: user.email,
          studio_id: studio.id,
          purpose: 'featured_upgrade',
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[SUCCESS] Featured upgrade checkout created: ${stripeSession.id} for user ${userId}, studio ${studio.id}`);

    return NextResponse.json({ clientSecret: stripeSession.client_secret });
  } catch (error) {
    console.error('Featured upgrade checkout error:', error);
    handleApiError(error, 'Featured upgrade checkout failed');

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

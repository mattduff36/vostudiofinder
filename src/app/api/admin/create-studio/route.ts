import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { nanoid } from 'nanoid';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';
import { hashPassword } from '@/lib/auth-utils';

/**
 * Admin-only endpoint to create user accounts with stub studio profiles.
 * 
 * Creates a user (ACTIVE, optional password) and a studio profile.
 * Supports both manual account creation and test account generation.
 * 
 * POST /api/admin/create-studio
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.email === 'admin@mpdee.co.uk' || session?.user?.username === 'VoiceoverGuy';
    if (!session?.user || !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isTestAccount = body.is_test_account === true;

    console.log(`👤 Admin creating ${isTestAccount ? 'test ' : ''}account:`, {
      hasUsername: !!body.username,
      hasEmail: !!body.email,
      hasPassword: !!body.password,
      hasProfileData: !!body.profile_data,
      membershipTier: body.membership_tier,
      bypassEmailVerification: body.bypass_email_verification,
      adminEmail: session.user.email,
    });

    const {
      username,
      display_name,
      email,
      password,
      membership_tier = 'BASIC',
      bypass_email_verification = true,
      is_profile_visible = false,
      profile_data,
    } = body;

    // Validation — only account fields are required
    if (!username || !display_name || !email) {
      console.log('❌ Missing account fields:', { username: !!username, display_name: !!display_name, email: !!email });
      return NextResponse.json(
        { error: 'Username, Display Name, and Email are required' },
        { status: 400 }
      );
    }

    // Normalise email
    const normalisedEmail = email.trim().toLowerCase();

    // Check if user already exists by email
    const existingUser = await db.users.findUnique({
      where: { email: normalisedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Check if username is already taken (case-insensitive)
    const existingUsername = await db.users.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        },
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Validate password: if provided, must be at least 8 characters
    if (password != null && typeof password === 'string' && password.length > 0 && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (password && typeof password === 'string' && password.length >= 8) {
      hashedPassword = await hashPassword(password);
    }

    // Create user — ACTIVE, signup marked as complete
    const userId = nanoid();
    const now = new Date();
    const isPremium = membership_tier === 'PREMIUM';

    const user = await db.users.create({
      data: {
        id: userId,
        email: normalisedEmail,
        username,
        display_name,
        role: 'USER',
        status: 'ACTIVE',
        membership_tier: isPremium ? 'PREMIUM' : 'BASIC',
        email_verified: bypass_email_verification === true,
        password: hashedPassword,
        payment_attempted_at: now, // Marks signup as complete
        created_at: now,
        updated_at: now,
      },
    });

    console.log('✅ User created:', {
      email: user.email,
      status: 'ACTIVE',
      tier: user.membership_tier,
      hasPassword: !!hashedPassword,
      isTest: isTestAccount,
    });

    // Build studio profile data
    const studioProfileId = nanoid();
    const studioData: Record<string, unknown> = {
      id: studioProfileId,
      user_id: user.id,
      name: profile_data?.name ?? '',
      city: profile_data?.city ?? '',
      status: 'ACTIVE',
      is_premium: isPremium,
      is_profile_visible: is_profile_visible === true,
      show_email: true,
      created_at: now,
      updated_at: now,
    };

    // Populate additional profile fields if provided
    if (profile_data) {
      if (profile_data.short_about) studioData.short_about = profile_data.short_about;
      if (profile_data.about) studioData.about = profile_data.about;
      if (profile_data.website_url) studioData.website_url = profile_data.website_url;
      if (profile_data.phone) studioData.phone = profile_data.phone;
      if (profile_data.equipment_list) studioData.equipment_list = profile_data.equipment_list;
      if (profile_data.rate_tier_1) studioData.rate_tier_1 = profile_data.rate_tier_1;
      if (profile_data.rate_tier_2) studioData.rate_tier_2 = profile_data.rate_tier_2;
      if (profile_data.rate_tier_3) studioData.rate_tier_3 = profile_data.rate_tier_3;
      if (profile_data.show_rates !== undefined) studioData.show_rates = profile_data.show_rates;

      // Social links
      if (profile_data.social_links) {
        const socialFields = [
          'facebook_url', 'x_url', 'linkedin_url', 'instagram_url',
          'tiktok_url', 'threads_url', 'youtube_url', 'soundcloud_url',
          'vimeo_url', 'bluesky_url',
        ];
        for (const field of socialFields) {
          if (profile_data.social_links[field]) {
            studioData[field] = profile_data.social_links[field];
          }
        }
      }

      // Connections (connection1-connection12)
      if (profile_data.connections) {
        for (let i = 1; i <= 12; i++) {
          const key = `connection${i}`;
          if (profile_data.connections[key]) {
            studioData[key] = profile_data.connections[key];
          }
        }
      }
    }

    // Create studio profile
    await db.studio_profiles.create({
      data: studioData as Parameters<typeof db.studio_profiles.create>[0]['data'],
    });

    console.log('✅ Studio profile created:', studioProfileId);

    // Create studio_studio_types records if studio types are provided
    if (profile_data?.studio_types && Array.isArray(profile_data.studio_types)) {
      const validTypes = ['HOME', 'RECORDING', 'PODCAST', 'VOICEOVER', 'VO_COACH', 'AUDIO_PRODUCER'];
      const typesToCreate = profile_data.studio_types.filter((t: string) => validTypes.includes(t));

      if (typesToCreate.length > 0) {
        await db.studio_studio_types.createMany({
          data: typesToCreate.map((studioType: string) => ({
            id: nanoid(),
            studio_id: studioProfileId,
            studio_type: studioType as 'HOME' | 'RECORDING' | 'PODCAST' | 'VOICEOVER' | 'VO_COACH' | 'AUDIO_PRODUCER',
          })),
        });
        console.log(`✅ Created ${typesToCreate.length} studio type(s):`, typesToCreate);
      }
    }

    console.log('🎉 Admin account creation complete!');

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
          membership_tier: user.membership_tier,
        },
        studio: {
          id: studioProfileId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Admin account creation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    handleApiError(error, 'Admin account creation failed');

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create account' },
      { status: 500 }
    );
  }
}

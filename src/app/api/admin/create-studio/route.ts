import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { nanoid } from 'nanoid';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';

/**
 * Admin-only endpoint to create user accounts with stub studio profiles.
 * 
 * Creates a user (ACTIVE, no password) and a minimal empty studio profile.
 * The user fills in their studio details later via Edit Profile.
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
    console.log('👤 Admin creating account:', {
      hasUsername: !!body.username,
      hasEmail: !!body.email,
      membershipTier: body.membership_tier,
      bypassEmailVerification: body.bypass_email_verification,
      adminEmail: session.user.email,
    });

    const {
      username,
      display_name,
      email,
      membership_tier = 'BASIC',
      bypass_email_verification = true,
      is_profile_visible = false,
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

    // Create user — ACTIVE, no password, signup marked as complete
    const userId = nanoid();
    const now = new Date();

    const user = await db.users.create({
      data: {
        id: userId,
        email: normalisedEmail,
        username,
        display_name,
        role: 'USER',
        status: 'ACTIVE',
        membership_tier: membership_tier === 'PREMIUM' ? 'PREMIUM' : 'BASIC',
        email_verified: bypass_email_verification === true,
        password: null, // User sets via "Forgot Password"
        payment_attempted_at: now, // Marks signup as complete
        created_at: now,
        updated_at: now,
      },
    });

    console.log('✅ User created:', { email: user.email, status: 'ACTIVE', tier: user.membership_tier });

    // Create minimal stub studio profile
    const studioProfileId = nanoid();

    await db.studio_profiles.create({
      data: {
        id: studioProfileId,
        user_id: user.id,
        name: '',
        city: '',
        status: 'ACTIVE',
        is_premium: membership_tier === 'PREMIUM',
        is_profile_visible: is_profile_visible === true,
        show_email: true,
        created_at: now,
        updated_at: now,
      },
    });

    console.log('✅ Stub studio profile created:', studioProfileId);
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

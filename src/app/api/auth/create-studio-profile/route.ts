import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { createUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { sendVerificationEmail } from '@/lib/email/email-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Profile creation request received:', {
      hasSessionId: !!body.sessionId,
      hasUsername: !!body.username,
      hasEmail: !!body.email,
      hasPassword: !!body.password,
      studioTypes: body.studio_types,
      imageCount: body.images?.length,
      connections: body.connections
    });

    const {
      sessionId,
      username,
      display_name,
      email,
      password,
      studio_name,
      short_about,
      about,
      studio_types,
      full_address,
      abbreviated_address,
      city,
      location,
      website_url,
      connections,
      images,
    } = body;

    // Validation with detailed logging
    if (!sessionId || !username || !display_name || !email || !password) {
      console.log('❌ Missing account fields:', { sessionId: !!sessionId, username: !!username, display_name: !!display_name, email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Missing required account fields' },
        { status: 400 }
      );
    }

    if (!studio_name || !short_about || !about || !location || !website_url) {
      console.log('❌ Missing studio fields:', { studio_name: !!studio_name, short_about: !!short_about, about: !!about, location: !!location, website_url: !!website_url });
      return NextResponse.json(
        { error: 'Missing required studio fields' },
        { status: 400 }
      );
    }

    if (!studio_types || studio_types.length === 0) {
      console.log('❌ No studio types:', studio_types);
      return NextResponse.json(
        { error: 'At least one studio type is required' },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      console.log('❌ No images:', images);
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    const hasConnection = connections && typeof connections === 'object' && Object.values(connections).some(v => v);
    if (!hasConnection) {
      console.log('❌ No connections selected:', connections);
      return NextResponse.json(
        { error: 'At least one connection method is required' },
        { status: 400 }
      );
    }

    // Verify payment session (skip in dev mode)
    const isDevMode = process.env.NODE_ENV === 'development' || sessionId.startsWith('cs_dev_');
    
    if (!isDevMode) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: 'Stripe configuration not available' },
          { status: 500 }
        );
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Payment not verified' },
          { status: 400 }
        );
      }
    } else {
      console.log('🔧 DEV MODE: Skipping Stripe payment verification for profile creation');
    }

    // Check if user already exists
    const existingUser = await db.users.findUnique({
      where: { email },
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

    // Create user with membership info
    const user = await createUser({
      email,
      password, // Password from signup form
      display_name,
      username,
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token (all users are USER role by default)
    await db.users.update({
      where: { id: user.id },
      data: {
        role: 'USER',
        verification_token: verificationToken,
        verification_token_expiry: verificationTokenExpiry,
      },
    });

    // Create studio profile
    const studioProfileId = nanoid();
    
    // Process connections - convert boolean object to connection strings
    const connectionData: any = {};
    Object.entries(connections).forEach(([key, value]) => {
      if (value) {
        connectionData[key] = '1';
      }
    });

    await db.studio_profiles.create({
      data: {
        id: studioProfileId,
        user_id: user.id,
        name: studio_name,
        short_about,
        about,
        full_address: full_address || null,
        abbreviated_address: abbreviated_address || null,
        city: city || '',
        location,
        website_url,
        created_at: new Date(),
        updated_at: new Date(),
        ...connectionData, // Spread connection methods
      },
    });

    // Create studio types
    for (const studioType of studio_types) {
      await db.studio_studio_types.create({
        data: {
          id: nanoid(),
          studio_id: studioProfileId,
          studio_type: studioType as any,
        },
      });
    }

    // Create studio images
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      await db.studio_images.create({
        data: {
          id: nanoid(),
          studio_id: studioProfileId,
          image_url: image.url,
          alt_text: image.alt_text || `Studio image ${i + 1}`,
          sort_order: i,
        },
      });
    }

    // Mark the session as used (only in production)
    if (!isDevMode && process.env.STRIPE_SECRET_KEY) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      await stripe.checkout.sessions.update(sessionId, {
        metadata: {
          ...session.metadata,
          account_created: 'true',
          user_id: user.id,
          studio_id: studioProfileId,
        },
      });
    }

    // Send verification email
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
    
    try {
      const emailSent = await sendVerificationEmail(
        user.email,
        user.display_name,
        verificationUrl
      );
      
      if (emailSent) {
        console.log('✅ Verification email sent successfully to:', user.email);
      } else {
        console.warn('⚠️ Failed to send verification email to:', user.email);
        // Don't fail the request, just log the warning
      }
    } catch (emailError) {
      console.error('❌ Error sending verification email:', emailError);
      // Don't fail the request, email sending is non-critical for profile creation
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'Profile created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Studio profile creation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    handleApiError(error, 'Studio profile creation failed');
    
    if (error instanceof Error) {
      // Return the actual error message in development
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Failed to create profile';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

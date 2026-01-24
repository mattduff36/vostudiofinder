import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { nanoid } from 'nanoid';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';

/**
 * Admin-only endpoint to create studio profiles manually
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
    console.log('👤 Admin creating studio profile:', {
      hasUsername: !!body.username,
      hasEmail: !!body.email,
      studioTypes: body.studio_types,
      imageCount: body.images?.length,
      connections: body.connections,
      adminEmail: session.user.email,
    });

    const {
      username,
      display_name,
      email,
      studio_name,
      short_about,
      about,
      studio_types,
      full_address,
      city,
      location,
      website_url,
      connections,
      images,
    } = body;

    // Validation
    if (!username || !display_name || !email) {
      console.log('❌ Missing account fields:', { username: !!username, display_name: !!display_name, email: !!email });
      return NextResponse.json(
        { error: 'Username, Display Name, and Email are required' },
        { status: 400 }
      );
    }

    if (!studio_name || !short_about || !about || !location || !website_url) {
      console.log('❌ Missing studio fields:', { studio_name: !!studio_name, short_about: !!short_about, about: !!about, location: !!location, website_url: !!website_url });
      return NextResponse.json(
        { error: 'All studio fields are required' },
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

    // Create user WITHOUT password (user will set via forgot password)
    const userId = nanoid();
    const user = await db.users.create({
      data: {
        id: userId,
        email,
        username,
        display_name,
        role: 'USER',
        email_verified: true, // Admin-created accounts are pre-verified
        password: null, // No password - user will set via forgot password
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log('✅ User created without password:', user.email);

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
        city: city || '',
        location,
        website_url,
        show_email: true, // Enable messages by default (matching schema default)
        status: 'ACTIVE', // Admin-created profiles are immediately active
        created_at: new Date(),
        updated_at: new Date(),
        ...connectionData,
      },
    });

    console.log('✅ Studio profile created:', studioProfileId);

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

    console.log(`✅ Created ${studio_types.length} studio types`);

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

    console.log(`✅ Created ${images.length} studio images`);
    console.log('🎉 Admin studio creation complete!');
    
    return NextResponse.json(
      {
        success: true,
        message: 'Studio profile created successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
        },
        studio: {
          id: studioProfileId,
          name: studio_name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Admin studio creation error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    handleApiError(error, 'Admin studio creation failed');
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create studio' },
      { status: 500 }
    );
  }
}






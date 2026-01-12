import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createStudioSchema } from '@/lib/validations/studio';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { randomBytes } from 'crypto';
import { requireActiveMembership } from '@/lib/membership';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check membership
    const membershipCheck = await requireActiveMembership(session.user.id);
    if (membershipCheck.error) {
      return NextResponse.json(
        { error: membershipCheck.error, requiresPayment: true },
        { status: membershipCheck.status || 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate input
    const validatedData = createStudioSchema.parse(body);
    
    // Create studio in a transaction
    const studio = await db.$transaction(async (tx) => {
      // Geocode full_address if provided
      let latitude = null;
      let longitude = null;
      if (validatedData.full_address) {
        const { geocodeAddress } = await import('@/lib/maps');
        const geocodeResult = await geocodeAddress(validatedData.full_address);
        if (geocodeResult) {
          latitude = geocodeResult.lat;
          longitude = geocodeResult.lng;
        }
      }
      
      // Create the studio profile
      const newStudio = await tx.studio_profiles.create({
        data: {
          id: randomBytes(12).toString('base64url'), // Generate unique ID
          user_id: session.user.id,
          name: validatedData.name,
          description: validatedData.description,
          full_address: validatedData.full_address || null,
          city: validatedData.city || '',
          latitude: latitude,
          longitude: longitude,
          website_url: validatedData.website_url || null,
          phone: validatedData.phone || null,
          is_profile_visible: false, // Hidden by default, user can manually enable when ready
          status: 'ACTIVE',
          updated_at: new Date(), // Add required timestamp
        },
      });
      
      // Add studio types
      if (validatedData.studio_studio_types && validatedData.studio_studio_types.length > 0) {
        for (const studio_type of validatedData.studio_studio_types) {
          await tx.studio_studio_types.create({
            data: {
              id: randomBytes(12).toString('base64url'), // Generate unique ID
              studio_id: newStudio.id,
              studio_type,
            },
          });
        }
      }
      
      // Add services
      if (validatedData.studio_services && validatedData.studio_services.length > 0) {
        for (const service of validatedData.studio_services) {
          await tx.studio_services.create({
            data: {
              id: randomBytes(12).toString('base64url'), // Generate unique ID
              studio_id: newStudio.id,
              service,
            },
          });
        }
      }
      
      // Add images
      if (validatedData.studio_images && validatedData.studio_images.length > 0) {
        for (const [index, image] of validatedData.studio_images.entries()) {
          await tx.studio_images.create({
            data: {
              id: randomBytes(12).toString('base64url'), // Generate unique ID
              studio_id: newStudio.id,
              image_url: image.url,
              alt_text: image.alt_text || null,
              sort_order: index,
            },
          });
        }
      }
      
      return newStudio;
    });
    
    // Fetch the complete studio profile data to return
    const completeStudio = await db.studio_profiles.findUnique({
      where: { id: studio.id },
      include: {
        studio_studio_types: true,
        studio_services: true,
        studio_images: {
          orderBy: { sort_order: 'asc' },
        },
        users: {
          select: {
            id: true,
            display_name: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });
    
    // Serialize Decimal fields for JSON response
    const serializedStudio = completeStudio ? {
      ...completeStudio,
      latitude: completeStudio.latitude ? Number(completeStudio.latitude) : null,
      longitude: completeStudio.longitude ? Number(completeStudio.longitude) : null,
    } : null;

    return NextResponse.json(
      {
        message: 'Studio created successfully',
        studio: serializedStudio,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Studio creation error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}


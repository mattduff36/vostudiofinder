import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateStudioSchema } from '@/lib/validations/studio';
import { requireActiveMembership } from '@/lib/membership';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    // Validate the input
    const validatedData = updateStudioSchema.parse(body);

    // Get the studio ID from the request body
    const { id, ...updateData } = validatedData;

    if (!id) {
      return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
    }

    // Check if the studio exists and belongs to the user
    const existingStudio = await db.studio_profiles.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!existingStudio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    if (existingStudio.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update data object with only provided fields
    const updateFields: any = {};
    
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.address !== undefined) updateFields.address = updateData.address; // Legacy field
    if (updateData.full_address !== undefined) updateFields.full_address = updateData.full_address;
    if (updateData.website_url !== undefined) updateFields.website_url = updateData.website_url;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.latitude !== undefined) updateFields.latitude = updateData.latitude;
    if (updateData.longitude !== undefined) updateFields.longitude = updateData.longitude;
    
    // Geocode full_address if it's being updated and coordinates aren't manually set
    if (updateData.full_address !== undefined && updateData.full_address && 
        updateData.latitude === undefined && updateData.longitude === undefined) {
      const { geocodeAddress } = await import('@/lib/maps');
      const geocodeResult = await geocodeAddress(updateData.full_address);
      if (geocodeResult) {
        // On success: set coordinates and derive city/country
        updateFields.latitude = geocodeResult.lat;
        updateFields.longitude = geocodeResult.lng;
        // Auto-populate city if not explicitly provided
        if (updateData.city === undefined && geocodeResult.city) {
          updateFields.city = geocodeResult.city;
        }
        // Note: location (country) is stored in studio_profiles for this route
        // We don't have access to it here as it's not in the studio schema for this route
      } else {
        // On failure: clear coordinates
        updateFields.latitude = null;
        updateFields.longitude = null;
      }
    }

    // Handle studio types update if provided
    if (updateData.studio_studio_types !== undefined) {
      updateFields.studio_studio_types = {
        deleteMany: {}, // Remove existing studio types
        create: updateData.studio_studio_types.map(studio_type => ({ studio_type })),
      };
    }

    // Handle services update if provided
    if (updateData.studio_services !== undefined) {
      updateFields.studio_services = {
        deleteMany: {}, // Remove existing services
        create: updateData.studio_services.map(service => ({ service })),
      };
    }

    // Handle images update if provided
    if (updateData.studio_images !== undefined) {
      updateFields.studio_images = {
        deleteMany: {}, // Remove existing images
        create: updateData.studio_images.map((image, index) => ({
          image_url: image.url,
          alt_text: image.alt_text || '',
          sort_order: index,
        })),
      };
    }

    // Update the studio
    const updatedStudio = await db.studio_profiles.update({
      where: { id },
      data: updateFields,
      include: {
        studio_studio_types: true,
        studio_services: true,
        studio_images: {
          orderBy: { sort_order: 'asc' },
        },
        users: {
          select: {
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      studio: updatedStudio,
    });

  } catch (error) {
    console.error('Update studio error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateStudioSchema } from '@/lib/validations/studio';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const existingStudio = await db.studios.findUnique({
      where: { id },
      include: {
        owner: {
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

    if (existingStudio.owner_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update data object with only provided fields
    const updateFields: any = {};
    
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.address !== undefined) updateFields.address = updateData.address;
    if (updateData.website_url !== undefined) updateFields.website_url = updateData.website_url;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone;
    if (updateData.latitude !== undefined) updateFields.latitude = updateData.latitude;
    if (updateData.longitude !== undefined) updateFields.longitude = updateData.longitude;

    // Handle studio types update if provided
    if (updateData.studioTypes !== undefined) {
      updateFields.studioTypes = {
        deleteMany: {}, // Remove existing studio types
        create: updateData.studioTypes.map(studioType => ({ studioType })),
      };
    }

    // Handle services update if provided
    if (updateData.services !== undefined) {
      updateFields.services = {
        deleteMany: {}, // Remove existing services
        create: updateData.services.map(service => ({ service })),
      };
    }

    // Handle images update if provided
    if (updateData.images !== undefined) {
      updateFields.images = {
        deleteMany: {}, // Remove existing images
        create: updateData.images.map((image, index) => ({
          imageUrl: image.url,
          altText: image.altText || '',
          sortOrder: index,
        })),
      };
    }

    // Update the studio
    const updatedStudio = await db.studios.update({
      where: { id },
      data: updateFields,
      include: {
        studioTypes: true,
        services: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        owner: {
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

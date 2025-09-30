import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createStudioSchema } from '@/lib/validations/studio';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the input
    const validatedData = createStudioSchema.parse(body);

    // Get the studio ID from the request body
    const { id, ...updateData } = validatedData;

    if (!id) {
      return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
    }

    // Check if the studio exists and belongs to the user
    const existingStudio = await db.studio.findUnique({
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

    if (existingStudio.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the studio
    const updatedStudio = await db.studio.update({
      where: { id },
      data: {
        name: updateData.name,
        description: updateData.description,
        studioType: updateData.studioType,
        address: updateData.address,
        websiteUrl: updateData.websiteUrl,
        phone: updateData.phone,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        services: {
          deleteMany: {}, // Remove existing services
          create: updateData.services.map(service => ({ service })),
        },
        images: {
          deleteMany: {}, // Remove existing images
          create: updateData.images.map((image, index) => ({
            imageUrl: image.imageUrl,
            altText: image.altText || '',
            sortOrder: index,
          })),
        },
      },
      include: {
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

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createStudioSchema } from '@/lib/validations/studio';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { Role } from '@/types/prisma';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has permission to create studios
    if (session.user.role !== Role.STUDIO_OWNER && session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'Insufficient permissions. You need to be a studio owner to create studios.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate input
    const validatedData = createStudioSchema.parse(body);
    
    // Create studio in a transaction
    const studio = await db.$transaction(async (tx) => {
      // Create the studio
      const newStudio = await tx.studios.create({
        data: {
          id: randomBytes(12).toString('base64url'), // Generate unique ID
          owner_id: session.user.id,
          name: validatedData.name,
          description: validatedData.description,
          address: validatedData.address,
          website_url: validatedData.website_url || null,
          phone: validatedData.phone || null,
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
    
    // Fetch the complete studio data to return
    const completeStudio = await db.studios.findUnique({
      where: { id: studio.id },
      include: {
        studio_studio_types: true,
        studio_services: true,
        studio_images: {
          orderBy: { sort_order: 'asc' },
        },
        owner: {
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


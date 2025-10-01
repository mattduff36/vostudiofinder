import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createStudioSchema } from '@/lib/validations/studio';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { Role } from '@prisma/client';

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
      const newStudio = await tx.studio.create({
        data: {
          ownerId: session.user.id,
          name: validatedData.name,
          description: validatedData.description,
          address: validatedData.address,
          websiteUrl: validatedData.websiteUrl || null,
          phone: validatedData.phone || null,
          status: 'ACTIVE',
        },
      });
      
      // Add studio types
      if (validatedData.studioTypes && validatedData.studioTypes.length > 0) {
        await tx.studioStudioType.createMany({
          data: validatedData.studioTypes.map(studioType => ({
            studioId: newStudio.id,
            studioType,
          })),
        });
      }
      
      // Add services
      if (validatedData.services && validatedData.services.length > 0) {
        await tx.studioService.createMany({
          data: validatedData.services.map(service => ({
            studioId: newStudio.id,
            service,
          })),
        });
      }
      
      // Add images
      if (validatedData.images && validatedData.images.length > 0) {
        await tx.studioImage.createMany({
          data: validatedData.images.map((image, index) => ({
            studioId: newStudio.id,
            imageUrl: image.url,
            altText: image.altText || null,
            sortOrder: index,
          })),
        });
      }
      
      return newStudio;
    });
    
    // Fetch the complete studio data to return
    const completeStudio = await db.studio.findUnique({
      where: { id: studio.id },
      include: {
        studioTypes: true,
        services: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        owner: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
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

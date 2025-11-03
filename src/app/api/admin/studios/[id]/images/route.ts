import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary environment variables not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'Image upload service not configured. Please contact the administrator.' 
      }, { status: 500 });
    }

    const studioId = (await params).id;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt_text = formData.get('alt_text') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const studio = await db.studios.findUnique({
      where: { id: studioId },
      include: { studio_images: true },
    });

    if (!studio) {
      return NextResponse.json({ success: false, error: 'Studio not found' }, { status: 404 });
    }

    if (studio.studio_images.length >= 10) {
      return NextResponse.json({ success: false, error: 'Maximum 10 images allowed per studio' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloudinaryResult: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: `vosf/studios/${studio.id}`,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      }, (error, result) => {
        if (error) reject(error);
        resolve(result);
      }).end(buffer);
    });

    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return NextResponse.json({ success: false, error: 'Failed to upload image to Cloudinary' }, { status: 500 });
    }

    const imageCount = studio.studio_images.length;
    const imageId = randomBytes(12).toString('hex');
    
    const newImage = await db.studio_images.create({
      data: {
        id: imageId,
        studio_id: studio.id,
        image_url: cloudinaryResult.secure_url,
        alt_text: alt_text || '',
        sort_order: imageCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: newImage.id,
        image_url: newImage.image_url,
        alt_text: newImage.alt_text,
        sort_order: newImage.sort_order,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    };
    
    console.error('Image upload error details:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload image',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}


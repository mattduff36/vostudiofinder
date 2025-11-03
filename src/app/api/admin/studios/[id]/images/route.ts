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
  console.log('🚀 Image upload API called');
  
  try {
    console.log('🔐 Checking authentication...');
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error('❌ Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session found:', { userId: session.user.id, role: session.user.role });

    // Check if user is admin
    if (session.user.role !== Role.ADMIN) {
      console.error('❌ Not admin:', session.user.role);
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin verified');

    // Check if Cloudinary is configured
    const cloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    console.log('☁️ Cloudinary configured:', cloudinaryConfigured);
    
    if (!cloudinaryConfigured) {
      console.error('❌ Cloudinary environment variables not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'Image upload service not configured. Please contact the administrator.' 
      }, { status: 500 });
    }

    console.log('📦 Awaiting params...');
    const studioId = (await params).id;
    console.log('✅ Studio ID:', studioId);
    console.log('📝 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt_text = formData.get('alt_text') as string;

    console.log('📁 File received:', { 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size,
      fileType: file?.type 
    });

    if (!file) {
      console.error('❌ No file in form data');
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    console.log('🔍 Looking up studio...');
    const studio = await db.studios.findUnique({
      where: { id: studioId },
      include: { studio_images: true },
    });

    if (!studio) {
      console.error('❌ Studio not found:', studioId);
      return NextResponse.json({ success: false, error: 'Studio not found' }, { status: 404 });
    }

    console.log('✅ Studio found:', { id: studio.id, imageCount: studio.studio_images.length });

    if (studio.studio_images.length >= 10) {
      console.error('❌ Too many images:', studio.studio_images.length);
      return NextResponse.json({ success: false, error: 'Maximum 10 images allowed per studio' }, { status: 400 });
    }

    console.log('🔄 Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('✅ Buffer created:', buffer.length, 'bytes');

    console.log('☁️ Uploading to Cloudinary...');
    const cloudinaryResult: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: `vosf/studios/${studio.id}`,
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      }, (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        }
        console.log('✅ Cloudinary upload success');
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
    console.error('❌ Error uploading image:', error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      nodeEnv: process.env.NODE_ENV,
    };
    
    console.error('❌ Image upload error details:', JSON.stringify(errorDetails, null, 2));
    
    // Always return details for admin endpoints to help debugging
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage || 'Failed to upload image',
        details: errorDetails
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
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
  logger.log('🚀 Image upload API called');
  
  try {
    logger.log('🔐 Checking authentication...');
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error('❌ Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    logger.log('✅ Session found:', { userId: session.user.id, role: session.user.role });

    // Check if user is admin
    if (session.user.role !== Role.ADMIN) {
      console.error('❌ Not admin:', session.user.role);
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    logger.log('✅ Admin verified');

    // Check if Cloudinary is configured
    const cloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
    logger.log('☁️ Cloudinary configured:', cloudinaryConfigured);
    
    if (!cloudinaryConfigured) {
      console.error('❌ Cloudinary environment variables not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'Image upload service not configured. Please contact the administrator.' 
      }, { status: 500 });
    }

    logger.log('📦 Awaiting params...');
    const studioId = (await params).id;
    logger.log('✅ Studio ID:', studioId);
    logger.log('📝 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt_text = formData.get('alt_text') as string;

    logger.log('📁 File received:', { 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size,
      fileType: file?.type 
    });

    if (!file) {
      console.error('❌ No file in form data');
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    logger.log('🔍 Looking up studio...');
    const studio = await db.studios.findUnique({
      where: { id: studioId },
      include: { studio_images: true },
    });

    if (!studio) {
      console.error('❌ Studio not found:', studioId);
      return NextResponse.json({ success: false, error: 'Studio not found' }, { status: 404 });
    }

    logger.log('✅ Studio found:', { id: studio.id, imageCount: studio.studio_images.length });

    if (studio.studio_images.length >= 10) {
      console.error('❌ Too many images:', studio.studio_images.length);
      return NextResponse.json({ success: false, error: 'Maximum 10 images allowed per studio' }, { status: 400 });
    }

    logger.log('🔄 Converting file to buffer...');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    logger.log('✅ Buffer created:', buffer.length, 'bytes');

    logger.log('☁️ Uploading to Cloudinary via direct API...');
    logger.log('☁️ Cloudinary config being used:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key_length: process.env.CLOUDINARY_API_KEY?.length,
      api_secret_length: process.env.CLOUDINARY_API_SECRET?.length,
    });
    
    // Use direct API instead of SDK to avoid serverless issues
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `vosf/studios/${studio.id}`;
    
    // Create signature for authenticated upload
    const crypto = require('crypto');
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=c_limit,h_800,w_1200/f_auto/q_auto${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha256').update(paramsToSign).digest('hex');
    
    // Create form data for Cloudinary API
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', new Blob([buffer]), file.name);
    cloudinaryFormData.append('timestamp', timestamp.toString());
    cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('transformation', 'c_limit,h_800,w_1200/f_auto/q_auto');
    cloudinaryFormData.append('api_key', process.env.CLOUDINARY_API_KEY!);
    cloudinaryFormData.append('signature', signature);
    
    logger.log('📤 Posting to Cloudinary API...');
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );
    
    logger.log('📥 Cloudinary response status:', cloudinaryResponse.status);
    
    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      console.error('❌ Cloudinary API error:', errorText);
      throw new Error(`Cloudinary upload failed: ${cloudinaryResponse.status} - ${errorText}`);
    }
    
    const cloudinaryResult = await cloudinaryResponse.json();
    logger.log('✅ Cloudinary upload success:', { 
      secure_url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id 
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
    let errorMessage = 'Unknown error';
    let errorStack = undefined;
    let cloudinaryError = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    } else if (typeof error === 'object' && error !== null) {
      // Cloudinary errors are objects with specific properties
      cloudinaryError = error;
      errorMessage = (error as any).message || (error as any).error?.message || 'Cloudinary upload failed';
    }
    
    const errorDetails = {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error,
      cloudinaryError: cloudinaryError,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
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


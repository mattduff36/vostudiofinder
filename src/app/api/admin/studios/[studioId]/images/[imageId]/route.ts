import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';
import { Role } from '@prisma/client';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { studioId: string; imageId: string } }
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

    const { studioId, imageId } = await params;
    const body = await request.json();
    const { alt_text } = body;

    const existingImage = await db.studio_images.findUnique({
      where: { id: imageId },
      include: { studios: { select: { id: true } } },
    });

    if (!existingImage || existingImage.studios.id !== studioId) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const updatedImage = await db.studio_images.update({
      where: { id: imageId },
      data: { alt_text },
    });

    return NextResponse.json({ success: true, message: 'Image updated successfully', data: updatedImage });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { studioId: string; imageId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { studioId, imageId } = await params;

    const existingImage = await db.studio_images.findUnique({
      where: { id: imageId },
      include: { studios: { select: { id: true } } },
    });

    if (!existingImage || existingImage.studios.id !== studioId) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    const publicId = existingImage.image_url.split('/').pop()?.split('.')[0];
    if (publicId) {
      await cloudinary.uploader.destroy(`vosf/studios/${existingImage.studios.id}/${publicId}`);
    }

    // Delete from database
    await db.studio_images.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}


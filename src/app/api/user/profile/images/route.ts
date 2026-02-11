import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadImage } from '@/lib/cloudinary';
import { IMAGE_RIGHTS_CONFIRMATION_TEXT, extractClientIp } from '@/lib/legal/image-rights';

/**
 * POST /api/user/profile/images
 * Upload a new studio image
 * 
 * Expects multipart/form-data with:
 * - file: Image file (required)
 * - alt_text: Alt text for accessibility (optional)
 * - image_rights_confirmed: "true" (required) — user must confirm they have rights
 */
export async function POST(request: NextRequest) {
  // Declared outside try so the catch block can clean up on failure
  let cloudinaryPublicId: string | undefined;

  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's active studio
    const studio = await db.studio_profiles.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
    });

    if (!studio) {
      return NextResponse.json(
        { success: false, error: 'No active studio found' },
        { status: 404 }
      );
    }

    // Get tier limits for image count enforcement
    const { getUserTierLimits } = await import('@/lib/membership');
    const tierLimits = await getUserTierLimits(userId);

    // Early (non-authoritative) image count check — avoids a Cloudinary upload
    // when the user is clearly already at the limit. The authoritative check
    // happens inside the transaction below.
    const earlyImageCount = await db.studio_images.count({
      where: { studio_id: studio.id },
    });

    if (earlyImageCount >= tierLimits.imagesMax) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum of ${tierLimits.imagesMax} images allowed for your membership tier.`,
          limit: tierLimits.imagesMax,
          current: earlyImageCount,
        },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt_text = formData.get('alt_text') as string;
    const imageRightsConfirmed = formData.get('image_rights_confirmed') as string;

    // Enforce image rights confirmation before allowing upload
    if (imageRightsConfirmed !== 'true') {
      return NextResponse.json(
        {
          success: false,
          error: 'Please confirm you own the rights to these images (or have permission to use them) before uploading.',
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 413 }
      );
    }

    // Extract client IP for the confirmation audit record (best-effort)
    const clientIp = extractClientIp(request.headers);

    // Upload to Cloudinary first (optimistic — outside the lock so we don't
    // hold a row lock during a slow external call).
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cloudinaryResult = await uploadImage(buffer, {
      folder: `studios/${studio.id}`,
      transformation: [
        { width: 2000, height: 960, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });
    cloudinaryPublicId = cloudinaryResult.public_id;

    // Authoritative count + insert inside a transaction with a row lock so
    // concurrent uploads can't both slip past the tier limit.
    // Also persists the image-rights confirmation audit record.
    const { randomBytes } = await import('crypto');
    const imageId = randomBytes(12).toString('hex');

    const newImage = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM studio_profiles WHERE id = ${studio.id} FOR UPDATE`;

      const imageCount = await tx.studio_images.count({
        where: { studio_id: studio.id },
      });

      if (imageCount >= tierLimits.imagesMax) {
        throw new Error('IMAGE_LIMIT_REACHED');
      }

      // Persist image-rights confirmation alongside the upload
      await tx.studio_profiles.update({
        where: { id: studio.id },
        data: {
          image_rights_confirmed_at: new Date(),
          image_rights_confirmed_text: IMAGE_RIGHTS_CONFIRMATION_TEXT,
          image_rights_confirmed_ip: clientIp,
          updated_at: new Date(),
        },
      });

      return tx.studio_images.create({
        data: {
          id: imageId,
          studio_id: studio.id,
          image_url: cloudinaryResult.secure_url,
          alt_text: alt_text || '',
          sort_order: imageCount, // Append to end
        },
      });
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
    // Handle the tier-limit error thrown inside the transaction.
    // Clean up the optimistically-uploaded Cloudinary image so it doesn't become orphaned.
    if (error instanceof Error && error.message === 'IMAGE_LIMIT_REACHED') {
      try {
        const { deleteImage } = await import('@/lib/cloudinary');
        if (cloudinaryPublicId) await deleteImage(cloudinaryPublicId);
      } catch (cleanupErr) {
        console.warn('[Image cleanup] Failed to delete orphaned Cloudinary image:', cleanupErr);
      }
      return NextResponse.json(
        { success: false, error: 'Image limit reached for your membership tier.' },
        { status: 400 }
      );
    }
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}


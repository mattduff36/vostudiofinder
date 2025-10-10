import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Helper function to decode HTML entities
function decodeHtmlEntities(str: string) {
  if (!str) return str;
  
  const htmlEntities: { [key: string]: string } = {
    '&pound;': '£',
    '&euro;': '€',
    '&dollar;': '$',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studioId = (await params).id;
    
    // Get studio with owner and profile data using Prisma
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: {
        owner: {
          include: {
            profile: true
          }
        },
        studioTypes: {
          select: {
            studioType: true
          }
        }
      }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Transform to match expected format for the frontend
    const studioData = {
      id: studio.id,
      username: studio.owner?.username, // Use actual username for URLs
      display_name: studio.owner?.username, // Use actual username for display
      email: studio.owner?.email,
      status: studio.status?.toLowerCase(),
      joined: studio.createdAt,
      last_name: decodeHtmlEntities(studio.owner?.profile?.lastName || ''),
      location: studio.owner?.profile?.location || '',
      address: studio.address || '',
      phone: studio.phone || '',
      url: studio.websiteUrl || '',
      instagram: studio.owner?.profile?.instagramUrl || '',
      youtubepage: studio.owner?.profile?.youtubeUrl || '',
      about: decodeHtmlEntities(studio.owner?.profile?.about || ''),
      latitude: studio.latitude ? parseFloat(studio.latitude.toString()) : null,
      longitude: studio.longitude ? parseFloat(studio.longitude.toString()) : null,
      shortabout: decodeHtmlEntities(studio.owner?.profile?.shortAbout || ''),
      category: '', // Not in new schema
      facebook: studio.owner?.profile?.facebookUrl || '',
      twitter: studio.owner?.profile?.twitterUrl || '',
      linkedin: studio.owner?.profile?.linkedinUrl || '',
      soundcloud: studio.owner?.profile?.soundcloudUrl || '',
      vimeo: studio.owner?.profile?.vimeoUrl || '',
      verified: studio.isVerified,
      featured: studio.owner?.profile?.isFeatured || false,
      avatar_image: studio.owner?.avatarUrl || '',
      // Rate data from profile (decode HTML entities)
      rates1: decodeHtmlEntities(studio.owner?.profile?.rateTier1 || ''),
      rates2: decodeHtmlEntities(studio.owner?.profile?.rateTier2 || ''),
      rates3: decodeHtmlEntities(studio.owner?.profile?.rateTier3 || ''),
      showrates: studio.owner?.profile?.showRates || false,
      // Contact preferences
      showemail: studio.owner?.profile?.showEmail || false,
      showphone: studio.owner?.profile?.showPhone || false,
      showaddress: studio.owner?.profile?.showAddress || false,
      // Connection types
      connection1: studio.owner?.profile?.connection1 || '',
      connection2: studio.owner?.profile?.connection2 || '',
      connection3: studio.owner?.profile?.connection3 || '',
      connection4: studio.owner?.profile?.connection4 || '',
      connection5: studio.owner?.profile?.connection5 || '',
      connection6: studio.owner?.profile?.connection6 || '',
      connection7: studio.owner?.profile?.connection7 || '',
      connection8: studio.owner?.profile?.connection8 || ''
    };
    
    // Structure the data to match what the frontend expects
    const profile = {
      // Basic user fields (not in _meta)
      id: studioData.id,
      username: studioData.username,
      display_name: studioData.display_name,
      email: studioData.email,
      status: studioData.status,
      joined: studioData.joined,
      studioTypes: studio.studioTypes || [],
      
      // All profile fields go in _meta for frontend compatibility
      _meta: {
        studio_name: studio.name, // Actual studio name from studios table
        last_name: studioData.last_name,
        location: studioData.location,
        address: studioData.address,
        phone: studioData.phone,
        url: studioData.url,
        instagram: studioData.instagram,
        youtubepage: studioData.youtubepage,
        about: studioData.about,
        latitude: studioData.latitude,
        longitude: studioData.longitude,
        shortabout: studioData.shortabout,
        category: studioData.category,
        facebook: studioData.facebook,
        twitter: studioData.twitter,
        linkedin: studioData.linkedin,
        soundcloud: studioData.soundcloud,
        vimeo: studioData.vimeo,
        verified: studioData.verified ? '1' : '0',
        featured: studioData.featured ? '1' : '0',
        avatar_image: studioData.avatar_image,
        // Rate data
        rates1: studioData.rates1,
        rates2: studioData.rates2,
        rates3: studioData.rates3,
        showrates: studioData.showrates ? '1' : '0',
        // Contact preferences
        showemail: studioData.showemail ? '1' : '0',
        showphone: studioData.showphone ? '1' : '0',
        showaddress: studioData.showaddress ? '1' : '0',
        // Connection types
        connection1: studioData.connection1 || '0',
        connection2: studioData.connection2 || '0',
        connection3: studioData.connection3 || '0',
        connection4: studioData.connection4 || '0',
        connection5: studioData.connection5 || '0',
        connection6: studioData.connection6 || '0',
        connection7: studioData.connection7 || '0',
        connection8: studioData.connection8 || '0'
      }
    };

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Get studio error:', error);
    return NextResponse.json({ error: 'Failed to fetch studio' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studioId = (await params).id;
    const body = await request.json();

    // Check if studio exists
    const existingStudio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: {
        owner: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!existingStudio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Prepare user updates
    const userUpdateData: any = {};
    if (body.username !== undefined) userUpdateData.username = body.username; // Username field updates actual username
    if (body.email !== undefined) userUpdateData.email = body.email;

    // Prepare studio updates
    const studioUpdateData: any = {};
    if (body._meta?.studio_name !== undefined) studioUpdateData.name = body._meta.studio_name; // Studio name field
    if (body._meta?.address !== undefined) studioUpdateData.address = body._meta.address;
    if (body._meta?.phone !== undefined) studioUpdateData.phone = body._meta.phone;
    if (body._meta?.url !== undefined) studioUpdateData.websiteUrl = body._meta.url;
    if (body._meta?.latitude !== undefined) studioUpdateData.latitude = parseFloat(body._meta.latitude) || null;
    if (body._meta?.longitude !== undefined) studioUpdateData.longitude = parseFloat(body._meta.longitude) || null;
    if (body._meta?.verified !== undefined) studioUpdateData.isVerified = body._meta.verified === '1' || body._meta.verified === true;

    // Prepare profile updates
    const profileUpdateData: any = {};
    if (body._meta?.last_name !== undefined) profileUpdateData.lastName = body._meta.last_name;
    if (body._meta?.location !== undefined) profileUpdateData.location = body._meta.location;
    if (body._meta?.about !== undefined) profileUpdateData.about = body._meta.about;
    if (body._meta?.shortabout !== undefined) profileUpdateData.shortAbout = body._meta.shortabout;
    if (body._meta?.facebook !== undefined) profileUpdateData.facebookUrl = body._meta.facebook;
    if (body._meta?.twitter !== undefined) profileUpdateData.twitterUrl = body._meta.twitter;
    if (body._meta?.linkedin !== undefined) profileUpdateData.linkedinUrl = body._meta.linkedin;
    if (body._meta?.instagram !== undefined) profileUpdateData.instagramUrl = body._meta.instagram;
    if (body._meta?.youtubepage !== undefined) profileUpdateData.youtubeUrl = body._meta.youtubepage;
    if (body._meta?.soundcloud !== undefined) profileUpdateData.soundcloudUrl = body._meta.soundcloud;
    if (body._meta?.vimeo !== undefined) profileUpdateData.vimeoUrl = body._meta.vimeo;
    if (body._meta?.featured !== undefined) profileUpdateData.isFeatured = body._meta.featured === '1' || body._meta.featured === true;
    // Rate updates
    if (body._meta?.rates1 !== undefined) profileUpdateData.rateTier1 = body._meta.rates1;
    if (body._meta?.rates2 !== undefined) profileUpdateData.rateTier2 = body._meta.rates2;
    if (body._meta?.rates3 !== undefined) profileUpdateData.rateTier3 = body._meta.rates3;
    if (body._meta?.showrates !== undefined) profileUpdateData.showRates = body._meta.showrates === '1' || body._meta.showrates === true;
    
    // Contact preferences
    if (body._meta?.showemail !== undefined) profileUpdateData.showEmail = body._meta.showemail === '1' || body._meta.showemail === true;
    if (body._meta?.showphone !== undefined) profileUpdateData.showPhone = body._meta.showphone === '1' || body._meta.showphone === true;
    if (body._meta?.showaddress !== undefined) profileUpdateData.showAddress = body._meta.showaddress === '1' || body._meta.showaddress === true;
    
    // Connection types
    if (body._meta?.connection1 !== undefined) profileUpdateData.connection1 = body._meta.connection1;
    if (body._meta?.connection2 !== undefined) profileUpdateData.connection2 = body._meta.connection2;
    if (body._meta?.connection3 !== undefined) profileUpdateData.connection3 = body._meta.connection3;
    if (body._meta?.connection4 !== undefined) profileUpdateData.connection4 = body._meta.connection4;
    if (body._meta?.connection5 !== undefined) profileUpdateData.connection5 = body._meta.connection5;
    if (body._meta?.connection6 !== undefined) profileUpdateData.connection6 = body._meta.connection6;
    if (body._meta?.connection7 !== undefined) profileUpdateData.connection7 = body._meta.connection7;
    if (body._meta?.connection8 !== undefined) profileUpdateData.connection8 = body._meta.connection8;

    // Perform updates using Prisma transactions
    await prisma.$transaction(async (tx) => {
      // Update user if there are user changes
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingStudio.ownerId },
          data: userUpdateData
        });
      }

      // Update studio if there are studio changes
      if (Object.keys(studioUpdateData).length > 0) {
        await tx.studio.update({
          where: { id: studioId },
          data: studioUpdateData
        });
      }

      // Update studio types if provided
      if (body.studioTypes !== undefined) {
        // Delete existing studio types
        await tx.studioStudioType.deleteMany({
          where: { studioId: studioId }
        });

        // Create new studio types
        if (Array.isArray(body.studioTypes) && body.studioTypes.length > 0) {
          await tx.studioStudioType.createMany({
            data: body.studioTypes.map((st: any) => ({
              studioId: studioId,
              studioType: st.studioType
            }))
          });
        }
      }

      // Update profile if there are profile changes
      if (Object.keys(profileUpdateData).length > 0) {
        await tx.userProfile.upsert({
          where: { userId: existingStudio.ownerId },
          update: profileUpdateData,
          create: {
            userId: existingStudio.ownerId,
            ...profileUpdateData
          }
        });
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Studio profile updated successfully'
    });

  } catch (error) {
    console.error('Update studio error:', error);
    return NextResponse.json({ error: 'Failed to update studio' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studioId = (await params).id;

    // Delete the studio
    await prisma.studio.delete({
      where: { id: studioId },
    });

    return NextResponse.json({
      success: true,
      message: 'Studio deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting studio:', error);
    return NextResponse.json(
      { error: 'Failed to delete studio' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

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
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      include: {
        users: {
          include: {
            user_profiles: true
          }
        },
        studio_studio_types: {
          select: {
            studio_type: true
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
      username: studio.users?.username, // Use actual username for URLs
      display_name: studio.users?.username, // Use actual username for display
      email: studio.users?.email,
      status: studio.status?.toLowerCase(),
      joined: studio.created_at,
      last_name: decodeHtmlEntities(studio.users?.user_profiles?.last_name || ''),
      location: studio.users?.user_profiles?.location || '',
      address: studio.address || '',
      phone: studio.phone || '',
      url: studio.website_url || '',
      instagram: studio.users?.user_profiles?.instagram_url || '',
      youtubepage: studio.users?.user_profiles?.youtube_url || '',
      about: decodeHtmlEntities(studio.users?.user_profiles?.about || ''),
      latitude: studio.latitude ? parseFloat(studio.latitude.toString()) : null,
      longitude: studio.longitude ? parseFloat(studio.longitude.toString()) : null,
      shortabout: decodeHtmlEntities(studio.users?.user_profiles?.short_about || ''),
      category: '', // Not in new schema
      facebook: studio.users?.user_profiles?.facebook_url || '',
      twitter: studio.users?.user_profiles?.twitter_url || '',
      linkedin: studio.users?.user_profiles?.linkedin_url || '',
      soundcloud: studio.users?.user_profiles?.soundcloud_url || '',
      vimeo: studio.users?.user_profiles?.vimeo_url || '',
      verified: studio.is_verified,
      featured: studio.users?.user_profiles?.is_featured || false,
      avatar_image: studio.users?.avatar_url || '',
      // Rate data from profile (decode HTML entities)
      rates1: decodeHtmlEntities(studio.users?.user_profiles?.rate_tier_1 || ''),
      rates2: decodeHtmlEntities(studio.users?.user_profiles?.rate_tier_2 || ''),
      rates3: decodeHtmlEntities(studio.users?.user_profiles?.rate_tier_3 || ''),
      showrates: studio.users?.user_profiles?.show_rates || false,
      // Contact preferences
      showemail: studio.users?.user_profiles?.show_email || false,
      showphone: studio.users?.user_profiles?.show_phone || false,
      showaddress: studio.users?.user_profiles?.show_address || false,
      // Connection types
      connection1: studio.users?.user_profiles?.connection1 || '',
      connection2: studio.users?.user_profiles?.connection2 || '',
      connection3: studio.users?.user_profiles?.connection3 || '',
      connection4: studio.users?.user_profiles?.connection4 || '',
      connection5: studio.users?.user_profiles?.connection5 || '',
      connection6: studio.users?.user_profiles?.connection6 || '',
      connection7: studio.users?.user_profiles?.connection7 || '',
      connection8: studio.users?.user_profiles?.connection8 || ''
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
      studioTypes: studio.studio_studio_types || [],
      
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
    const existingStudio = await prisma.studios.findUnique({
      where: { id: studioId },
      include: {
        users: {
          include: {
            user_profiles: true
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
    if (body._meta?.url !== undefined) studioUpdateData.website_url = body._meta.url;
    if (body._meta?.latitude !== undefined) studioUpdateData.latitude = parseFloat(body._meta.latitude) || null;
    if (body._meta?.longitude !== undefined) studioUpdateData.longitude = parseFloat(body._meta.longitude) || null;
    if (body._meta?.verified !== undefined) studioUpdateData.is_verified = body._meta.verified === '1' || body._meta.verified === true;

    // Prepare profile updates
    const profileUpdateData: any = {};
    if (body._meta?.last_name !== undefined) profileUpdateData.last_name = body._meta.last_name;
    if (body._meta?.location !== undefined) profileUpdateData.location = body._meta.location;
    if (body._meta?.about !== undefined) profileUpdateData.about = body._meta.about;
    if (body._meta?.shortabout !== undefined) profileUpdateData.short_about = body._meta.shortabout;
    if (body._meta?.facebook !== undefined) profileUpdateData.facebook_url = body._meta.facebook;
    if (body._meta?.twitter !== undefined) profileUpdateData.twitter_url = body._meta.twitter;
    if (body._meta?.linkedin !== undefined) profileUpdateData.linkedin_url = body._meta.linkedin;
    if (body._meta?.instagram !== undefined) profileUpdateData.instagram_url = body._meta.instagram;
    if (body._meta?.youtubepage !== undefined) profileUpdateData.youtube_url = body._meta.youtubepage;
    if (body._meta?.soundcloud !== undefined) profileUpdateData.soundcloud_url = body._meta.soundcloud;
    if (body._meta?.vimeo !== undefined) profileUpdateData.vimeo_url = body._meta.vimeo;
    if (body._meta?.featured !== undefined) profileUpdateData.is_featured = body._meta.featured === '1' || body._meta.featured === true;
    // Rate updates
    if (body._meta?.rates1 !== undefined) profileUpdateData.rate_tier_1 = body._meta.rates1;
    if (body._meta?.rates2 !== undefined) profileUpdateData.rate_tier_2 = body._meta.rates2;
    if (body._meta?.rates3 !== undefined) profileUpdateData.rate_tier_3 = body._meta.rates3;
    if (body._meta?.showrates !== undefined) profileUpdateData.show_rates = body._meta.showrates === '1' || body._meta.showrates === true;
    
    // Contact preferences
    if (body._meta?.showemail !== undefined) profileUpdateData.show_email = body._meta.showemail === '1' || body._meta.showemail === true;
    if (body._meta?.showphone !== undefined) profileUpdateData.show_phone = body._meta.showphone === '1' || body._meta.showphone === true;
    if (body._meta?.showaddress !== undefined) profileUpdateData.show_address = body._meta.showaddress === '1' || body._meta.showaddress === true;
    
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
        await tx.users.update({
          where: { id: existingStudio.owner_id },
          data: userUpdateData
        });
      }

      // Update studio if there are studio changes
      if (Object.keys(studioUpdateData).length > 0) {
        await tx.studios.update({
          where: { id: studioId },
          data: studioUpdateData
        });
      }

      // Update studio types if provided
      if (body.studioTypes !== undefined) {
        // Delete existing studio types
        await tx.studio_studio_types.deleteMany({
          where: { studio_id: studioId }
        });

        // Create new studio types
        if (Array.isArray(body.studioTypes) && body.studioTypes.length > 0) {
          // Generate IDs manually since schema doesn't have @default
          for (const st of body.studioTypes) {
            const id = randomBytes(12).toString('base64url'); // Generate unique ID
            await tx.studio_studio_types.create({
              data: {
                id,
                studio_id: studioId,
                studio_type: st.studio_type || st.studioType // Accept both formats
              }
            });
          }
        }
      }

      // Update profile if there are profile changes
      if (Object.keys(profileUpdateData).length > 0) {
        await tx.user_profiles.upsert({
          where: { user_id: existingStudio.owner_id },
          update: profileUpdateData,
          create: {
            user_id: existingStudio.owner_id,
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
    await prisma.studios.delete({
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

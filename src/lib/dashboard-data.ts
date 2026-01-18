/**
 * Shared dashboard data loading utilities
 * Used across all dashboard route segments
 */

import { db } from '@/lib/db';
import type { ProfileData, StudioImage, StudioType } from '@/types/profile';

export async function loadDashboardData(userId: string) {
  const initialProfileData: ProfileData | null = await (async () => {
    const userWithProfile = await db.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        display_name: true,
        username: true,
        email: true,
        avatar_url: true,
        role: true,
        studio_profiles: {
          include: {
            studio_studio_types: {
              select: { studio_type: true },
            },
            studio_images: {
              orderBy: { sort_order: 'asc' },
              select: {
                id: true,
                image_url: true,
                alt_text: true,
                sort_order: true,
              },
            },
          },
        },
      },
    });

    if (!userWithProfile) return null;

    // Extract first element since studio_profiles is a relation array (even with @unique constraint)
    const studioProfile = Array.isArray(userWithProfile.studio_profiles)
      ? userWithProfile.studio_profiles[0]
      : userWithProfile.studio_profiles;

    const studioTypes: StudioType[] =
      studioProfile?.studio_studio_types?.map((st: { studio_type: string }) => ({
        id: `${studioProfile.id}-${st.studio_type}`,
        name: st.studio_type,
      })) ?? [];

    const studioImages: StudioImage[] =
      studioProfile?.studio_images?.map((img: { id: string; image_url: string; alt_text: string | null; sort_order: number | null }) => ({
        id: img.id,
        studio_id: studioProfile.id,
        image_url: img.image_url,
        alt_text: img.alt_text ?? undefined,
        display_order: img.sort_order ?? 0,
      })) ?? [];

    return {
      user: {
        id: userWithProfile.id,
        display_name: userWithProfile.display_name,
        username: userWithProfile.username ?? '',
        email: userWithProfile.email ?? '',
        ...(userWithProfile.avatar_url && { avatar_url: userWithProfile.avatar_url }),
        role: userWithProfile.role as string,
      },
      profile: studioProfile
        ? {
            about: studioProfile.about ?? '',
            short_about: studioProfile.short_about ?? '',
            phone: studioProfile.phone ?? '',
            location: studioProfile.location ?? '',
            studio_name: studioProfile.name ?? '',
            rate_tier_1: studioProfile.rate_tier_1 ?? null,
            equipment_list: studioProfile.equipment_list ?? '',
            services_offered: studioProfile.services_offered ?? '',
            facebook_url: studioProfile.facebook_url ?? '',
            x_url: studioProfile.x_url ?? '',
            linkedin_url: studioProfile.linkedin_url ?? '',
            instagram_url: studioProfile.instagram_url ?? '',
            youtube_url: studioProfile.youtube_url ?? '',
            soundcloud_url: studioProfile.soundcloud_url ?? '',
            tiktok_url: studioProfile.tiktok_url ?? '',
            threads_url: studioProfile.threads_url ?? '',
            connection1: studioProfile.connection1 ?? '',
            connection2: studioProfile.connection2 ?? '',
            connection3: studioProfile.connection3 ?? '',
            connection4: studioProfile.connection4 ?? '',
            connection5: studioProfile.connection5 ?? '',
            connection6: studioProfile.connection6 ?? '',
            connection7: studioProfile.connection7 ?? '',
            connection8: studioProfile.connection8 ?? '',
            connection9: studioProfile.connection9 ?? '',
            connection10: studioProfile.connection10 ?? '',
            connection11: studioProfile.connection11 ?? '',
            connection12: studioProfile.connection12 ?? '',
          }
        : {},
      ...(studioProfile
        ? {
            studio: {
              id: studioProfile.id,
              name: studioProfile.name ?? '',
              user_id: studioProfile.user_id,
              ...(studioProfile.description && { description: studioProfile.description }),
              ...(studioProfile.website_url && { website_url: studioProfile.website_url }),
              ...(studioProfile.full_address && { full_address: studioProfile.full_address }),
              ...(studioProfile.city && { city: studioProfile.city }),
              latitude: studioProfile.latitude ? Number(studioProfile.latitude) : null,
              longitude: studioProfile.longitude ? Number(studioProfile.longitude) : null,
              status: studioProfile.status ?? 'ACTIVE',
              is_premium: !!studioProfile.is_premium,
              ...(studioProfile.is_profile_visible !== null && studioProfile.is_profile_visible !== undefined && { is_profile_visible: studioProfile.is_profile_visible }),
              images: studioImages,
              studio_types: studioTypes,
            },
          }
        : {}),
      studio_types: studioTypes,
    };
  })();

  // Fetch user's data and activities
  const [
    userStudios,
    userReviews,
    userMessages,
    userConnections,
  ] = await Promise.all([
    // User's studios (if they're a studio owner)
    db.studio_profiles.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        status: true,
        is_premium: true,
        created_at: true,
        studio_studio_types: {
          select: {
            studio_type: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    
    // User's reviews
    db.reviews.findMany({
      where: { reviewer_id: userId },
      include: {
        studio_profiles: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
    
    // User's messages
    db.messages.findMany({
      where: {
        OR: [
          { sender_id: userId },
          { receiver_id: userId },
        ],
      },
      include: {
        users_messages_sender_idTousers: {
          select: {
            display_name: true,
            avatar_url: true,
          },
        },
        users_messages_receiver_idTousers: {
          select: {
            display_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
    
    // User's connections
    db.user_connections.findMany({
      where: {
        OR: [
          { user_id: userId },
          { connected_user_id: userId },
        ],
        accepted: true,
      },
      include: {
        users_user_connections_user_idTousers: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
        users_user_connections_connected_user_idTousers: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
      take: 10,
    }),
  ]);

  // Calculate some stats
  const stats = {
    studiosOwned: userStudios.length,
    reviewsWritten: userReviews.length,
    totalConnections: userConnections.length,
    unreadMessages: userMessages.filter(msg => 
      msg.receiver_id === userId && !msg.is_read
    ).length,
  };

  const dashboardData = {
    user: {
      id: userId,
      display_name: initialProfileData?.user.display_name || '',
      email: initialProfileData?.user.email || '',
      username: initialProfileData?.user.username || '',
      role: initialProfileData?.user.role || '',
      ...(initialProfileData?.user.avatar_url && { avatar_url: initialProfileData.user.avatar_url }),
    },
    stats,
    studios: userStudios.map(studio => ({
      id: studio.id,
      name: studio.name,
      studio_type: studio.studio_studio_types && studio.studio_studio_types.length > 0 && studio.studio_studio_types[0] ? studio.studio_studio_types[0].studio_type : 'VOICEOVER',
      status: studio.status,
      is_premium: studio.is_premium,
      created_at: studio.created_at,
      _count: {
        reviews: studio._count.reviews,
      },
    })),
    reviews: userReviews.map(review => ({
      id: review.id,
      rating: review.rating,
      content: review.content || '',
      created_at: review.created_at,
      studio: review.studio_profiles,
    })),
    messages: userMessages.map(message => ({
      id: message.id,
      subject: message.subject || '',
      isRead: message.is_read,
      created_at: message.created_at,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      sender: {
        display_name: message.users_messages_sender_idTousers.display_name,
        ...(message.users_messages_sender_idTousers.avatar_url && { avatar_url: message.users_messages_sender_idTousers.avatar_url }),
      },
      receiver: {
        display_name: message.users_messages_receiver_idTousers.display_name,
        ...(message.users_messages_receiver_idTousers.avatar_url && { avatar_url: message.users_messages_receiver_idTousers.avatar_url }),
      },
    })),
    connections: userConnections.map(connection => ({
      id: connection.id,
      user_id: connection.user_id,
      connected_user_id: connection.connected_user_id,
      user: {
        id: connection.users_user_connections_user_idTousers.id,
        display_name: connection.users_user_connections_user_idTousers.display_name,
        ...(connection.users_user_connections_user_idTousers.avatar_url && { avatar_url: connection.users_user_connections_user_idTousers.avatar_url }),
      },
      connectedUser: {
        id: connection.users_user_connections_connected_user_idTousers.id,
        display_name: connection.users_user_connections_connected_user_idTousers.display_name,
        ...(connection.users_user_connections_connected_user_idTousers.avatar_url && { avatar_url: connection.users_user_connections_connected_user_idTousers.avatar_url }),
      },
    })),
  };

  return { dashboardData, initialProfileData };
}

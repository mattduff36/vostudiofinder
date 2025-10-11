import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-guards';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { db } from '@/lib/db';


export const metadata: Metadata = {
  title: 'Dashboard - VoiceoverStudioFinder',
  description: 'Manage your profile, studios, and activities',
};

export default async function DashboardPage() {
  const session = await requireAuth();

  // Fetch user's data and activities
  const [
    userStudios,
    userReviews,
    userMessages,
    userConnections,
  ] = await Promise.all([
    // User's studios (if they're a studio owner)
    db.studios.findMany({
      where: { owner_id: session.user.id },
      include: {
        studio_services: true,
        studio_images: {
          take: 1,
          orderBy: { sort_order: 'asc' },
        },
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
      where: { reviewer_id: session.user.id },
      include: {
        studios: {
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
          { sender_id: session.user.id },
          { receiver_id: session.user.id },
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
          { user_id: session.user.id },
          { connected_user_id: session.user.id },
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
      msg.receiver_id === session.user.id && !msg.is_read
    ).length,
  };

  const dashboardData = {
    user: {
      id: session.user.id,
      display_name: session.user.display_name,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role as string,
      ...(session.user.avatar_url && { avatar_url: session.user.avatar_url }),
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
      studio: review.studios,
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

  return <UserDashboard data={dashboardData} />;
}





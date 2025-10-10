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
      where: { reviewerId: session.user.id },
      include: {
        studio: {
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
    db.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
      include: {
        sender: {
          select: {
            display_name: true,
            avatar_url: true,
          },
        },
        receiver: {
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
    db.userConnection.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { connectedUserId: session.user.id },
        ],
        accepted: true,
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
        connectedUser: {
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
      msg.receiverId === session.user.id && !msg.isRead
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
      studio_type: studio.studioTypes && studio.studioTypes.length > 0 && studio.studioTypes[0] ? studio.studioTypes[0].studio_type : 'VOICEOVER',
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
      studio: review.studio,
    })),
    messages: userMessages.map(message => ({
      id: message.id,
      subject: message.subject || '',
      isRead: message.isRead,
      created_at: message.created_at,
      senderId: message.senderId,
      receiverId: message.receiverId,
      sender: {
        display_name: message.sender.display_name,
        ...(message.sender.avatar_url && { avatar_url: message.sender.avatar_url }),
      },
      receiver: {
        display_name: message.receiver.display_name,
        ...(message.receiver.avatar_url && { avatar_url: message.receiver.avatar_url }),
      },
    })),
    connections: userConnections.map(connection => ({
      id: connection.id,
      userId: connection.userId,
      connectedUserId: connection.connectedUserId,
      user: {
        id: connection.user.id,
        display_name: connection.user.display_name,
        ...(connection.user.avatar_url && { avatar_url: connection.user.avatar_url }),
      },
      connectedUser: {
        id: connection.connectedUser.id,
        display_name: connection.connectedUser.display_name,
        ...(connection.connectedUser.avatar_url && { avatar_url: connection.connectedUser.avatar_url }),
      },
    })),
  };

  return <UserDashboard data={dashboardData} />;
}


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
    db.studio.findMany({
      where: { ownerId: session.user.id },
      include: {
        services: true,
        images: {
          take: 1,
          orderBy: { sortOrder: 'asc' },
        },
        studioTypes: {
          select: {
            studioType: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    
    // User's reviews
    db.review.findMany({
      where: { reviewerId: session.user.id },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
            displayName: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
            displayName: true,
            avatarUrl: true,
          },
        },
        connectedUser: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
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
      displayName: session.user.displayName,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role as string,
      ...(session.user.avatarUrl && { avatarUrl: session.user.avatarUrl }),
    },
    stats,
    studios: userStudios.map(studio => ({
      id: studio.id,
      name: studio.name,
      studioType: studio.studioTypes && studio.studioTypes.length > 0 && studio.studioTypes[0] ? studio.studioTypes[0].studioType : 'VOICEOVER',
      status: studio.status,
      isPremium: studio.isPremium,
      createdAt: studio.createdAt,
      _count: {
        reviews: studio._count.reviews,
      },
    })),
    reviews: userReviews.map(review => ({
      id: review.id,
      rating: review.rating,
      content: review.content || '',
      createdAt: review.createdAt,
      studio: review.studio,
    })),
    messages: userMessages.map(message => ({
      id: message.id,
      subject: message.subject || '',
      isRead: message.isRead,
      createdAt: message.createdAt,
      senderId: message.senderId,
      receiverId: message.receiverId,
      sender: {
        displayName: message.sender.displayName,
        ...(message.sender.avatarUrl && { avatarUrl: message.sender.avatarUrl }),
      },
      receiver: {
        displayName: message.receiver.displayName,
        ...(message.receiver.avatarUrl && { avatarUrl: message.receiver.avatarUrl }),
      },
    })),
    connections: userConnections.map(connection => ({
      id: connection.id,
      userId: connection.userId,
      connectedUserId: connection.connectedUserId,
      user: {
        id: connection.user.id,
        displayName: connection.user.displayName,
        ...(connection.user.avatarUrl && { avatarUrl: connection.user.avatarUrl }),
      },
      connectedUser: {
        id: connection.connectedUser.id,
        displayName: connection.connectedUser.displayName,
        ...(connection.connectedUser.avatarUrl && { avatarUrl: connection.connectedUser.avatarUrl }),
      },
    })),
  };

  return <UserDashboard data={dashboardData} />;
}

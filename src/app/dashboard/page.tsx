import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-guards';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

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
        studio: {
          select: {
            name: true,
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
    user: session.user,
    stats,
    studios: userStudios,
    reviews: userReviews,
    messages: userMessages,
    connections: userConnections,
  };

  return <UserDashboard data={dashboardData} />;
}

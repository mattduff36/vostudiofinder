import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role, UserStatus } from '@prisma/client';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Admin Dashboard - VoiceoverStudioFinder',
  description: 'Manage users, studios, reviews, and platform settings',
};

interface ActivityItem {
  id: string;
  type: 'user' | 'studio';
  action: string;
  description: string;
  timestamp: Date;
  metadata?: {
    username?: string;
    studioName?: string;
    status?: string;
    isVerified?: boolean;
  };
}

export default async function AdminPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  // Fetch dashboard statistics
  const [
    totalUsers,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    activeUsers30d,
    totalPayments,
    pendingReservations,
    expiredReservations,
    waitlistCount,
    openSupportTickets,
    recentUsers,
    recentStudios,
  ] = await Promise.all([
    // Total registered users
    db.users.count(),
    
    // Total studio profiles (1:1 with users who have studios)
    db.studio_profiles.count(),
    
    // Active studios
    db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
    
    // Verified studios
    db.studio_profiles.count({ where: { is_verified: true } }),
    
    // Featured studios
    db.studio_profiles.count({ where: { is_featured: true } }),
    
    // Active users in last 30 days (based on updated_at)
    db.users.count({
      where: {
        updated_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Total payments
    db.payments.count(),
    
    // Pending reservations
    db.users.count({ where: { status: UserStatus.PENDING } }),
    
    // Expired reservations
    db.users.count({ where: { status: UserStatus.EXPIRED } }),
    
    // Waitlist count
    db.waitlist.count(),
    
    // Open support tickets (OPEN or IN_PROGRESS)
    db.support_tickets.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
    
    // Recent users (last 20)
    db.users.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        display_name: true,
        username: true,
        role: true,
        created_at: true,
      },
    }),
    
    // Recent studios (last 20)
    db.studio_profiles.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        is_verified: true,
        created_at: true,
        users: {
          select: {
            display_name: true,
          },
        },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    activeUsers30d,
    totalPayments,
    totalReservations: pendingReservations + expiredReservations,
    waitlistCount,
    openSupportTickets,
  };

  // Create unified activity feed
  const activities: ActivityItem[] = [];

  // Add user activities
  recentUsers.forEach(user => {
    activities.push({
      id: `user-${user.id}`,
      type: 'user',
      action: 'New User Registration',
      description: `${user.display_name} (@${user.username}) joined the platform`,
      timestamp: user.created_at,
      metadata: {
        username: user.username,
      },
    });
  });

  // Add studio activities
  recentStudios.forEach(studio => {
    activities.push({
      id: `studio-${studio.id}`,
      type: 'studio',
      action: 'Studio Created',
      description: `${studio.name} by ${studio.users.display_name}`,
      timestamp: studio.created_at,
      metadata: {
        studioName: studio.name,
        status: studio.status,
        isVerified: studio.is_verified,
      },
    });
  });

  // Sort by timestamp (most recent first) and limit to 30
  const recentActivity = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 30);

  return (
    <AdminDashboard 
      stats={stats}
      recentActivity={recentActivity}
    />
  );
}

import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
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

/**
 * Helper function to identify test accounts
 */
function isTestAccount(email: string, username: string): boolean {
  const emailLower = email.toLowerCase();
  const usernameLower = username.toLowerCase();
  
  return (
    emailLower.includes('test') ||
    emailLower.includes('temp') ||
    emailLower.endsWith('@test.com') ||
    usernameLower.startsWith('test') ||
    usernameLower.startsWith('temp') ||
    usernameLower.startsWith('expired_')
  );
}

export default async function AdminPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  // Fetch dashboard statistics
  const [
    allUsers,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    premiumStudios,
    recentUsers,
    recentStudios,
  ] = await Promise.all([
    // Get all users with email/username for test account filtering
    db.users.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true,
        updated_at: true,
        studio_profiles: {
          select: { id: true },
        },
      },
    }),
    
    // Total studio profiles (1:1 with users who have studios)
    db.studio_profiles.count(),
    
    // Active studios
    db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
    
    // Verified studios
    db.studio_profiles.count({ where: { is_verified: true } }),
    
    // Featured studios
    db.studio_profiles.count({ where: { is_featured: true } }),
    
    // Premium studios
    db.studio_profiles.count({ where: { is_premium: true } }),
    
    // Recent users (last 20) - exclude test accounts
    db.users.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
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
            email: true,
            username: true,
          },
        },
      },
    }),
  ]);

  // Filter out test accounts
  const realUsers = allUsers.filter(u => !isTestAccount(u.email, u.username));
  const testUsers = allUsers.filter(u => isTestAccount(u.email, u.username));
  
  // Count real users with studios
  const realUsersWithStudios = realUsers.filter(u => u.studio_profiles !== null).length;
  
  // Count active users in last 30 days (excluding test accounts)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeUsers30d = realUsers.filter(u => 
    u.updated_at >= thirtyDaysAgo
  ).length;

  const stats = {
    totalUsers: realUsers.length,
    testUsers: testUsers.length,
    usersWithStudios: realUsersWithStudios,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    premiumStudios,
    activeUsers30d,
  };

  // Create unified activity feed
  const activities: ActivityItem[] = [];

  // Add user activities (exclude test accounts)
  recentUsers
    .filter(user => !isTestAccount(user.email, user.username))
    .forEach(user => {
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

  // Add studio activities (exclude test accounts)
  recentStudios
    .filter(studio => !isTestAccount(studio.users.email, studio.users.username))
    .forEach(studio => {
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

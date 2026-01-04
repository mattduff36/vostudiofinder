import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Admin Dashboard - VoiceoverStudioFinder',
  description: 'Manage users, studios, reviews, and platform settings',
};

export default async function AdminPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  // Fetch dashboard statistics
  const [
    totalUsers,
    usersWithStudios,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    premiumStudios,
    totalReviews,
    pendingReviews,
    activeUsers30d,
    recentUsers,
    recentStudios,
    recentReviews,
  ] = await Promise.all([
    // Total registered users
    db.users.count(),
    
    // Users who have created studio profiles
    db.studio_profiles.count(),
    
    // Total studio profiles
    db.studio_profiles.count(),
    
    // Active studios
    db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
    
    // Verified studios
    db.studio_profiles.count({ where: { is_verified: true } }),
    
    // Featured studios
    db.studio_profiles.count({ where: { is_featured: true } }),
    
    // Premium studios
    db.studio_profiles.count({ where: { is_premium: true } }),
    
    // Total reviews
    db.reviews.count(),
    
    // Pending reviews
    db.reviews.count({ where: { status: 'PENDING' } }),
    
    // Active users in last 30 days (based on updated_at)
    db.users.count({
      where: {
        updated_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Recent users
    db.users.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        display_name: true,
        username: true,
        role: true,
        created_at: true,
      },
    }),
    
    // Recent studios
    db.studio_profiles.findMany({
      take: 5,
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
    
    // Recent reviews
    db.reviews.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        users_reviews_reviewer_idTousers: {
          select: {
            display_name: true,
          },
        },
        studio_profiles: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    usersWithStudios,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    premiumStudios,
    totalReviews,
    pendingReviews,
    activeUsers30d,
  };

  const recentActivity = {
    users: recentUsers,
    studios: recentStudios.map(studio => ({
      id: studio.id,
      name: studio.name,
      status: studio.status,
      is_verified: studio.is_verified,
      created_at: studio.created_at,
      owner: {
        display_name: studio.users.display_name,
      },
    })),
    reviews: recentReviews.map(review => ({
      id: review.id,
      rating: review.rating,
      status: review.status as string,
      created_at: review.created_at,
      reviewer: {
        display_name: review.users_reviews_reviewer_idTousers.display_name,
      },
      studio: {
        name: review.studio_profiles.name,
      },
    })),
  };

  return (
    <AdminDashboard 
      stats={stats}
      recentActivity={recentActivity}
    />
  );
}

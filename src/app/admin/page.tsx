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
    totalStudios,
    totalReviews,
    pendingReviews,
    activeUsers,
    premiumStudios,
    recentUsers,
    recentStudios,
    recentReviews,
  ] = await Promise.all([
    db.user.count(),
    db.studio.count({ where: { status: 'ACTIVE' } }),
    db.review.count(),
    db.review.count({ where: { status: 'PENDING' } }),
    db.user.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
    db.studio.count({ where: { isPremium: true, status: 'ACTIVE' } }),
    db.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    db.studio.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            displayName: true,
          },
        },
        studioTypes: {
          select: {
            studioType: true,
          },
        },
      },
    }),
    db.review.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            displayName: true,
          },
        },
        studio: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    totalStudios,
    totalReviews,
    pendingReviews,
    activeUsers,
    premiumStudios,
  };

  // Serialize Decimal fields for client components
  const recentActivity = {
    users: recentUsers,
    studios: recentStudios.map(studio => ({
      id: studio.id,
      name: studio.name,
      studioType: studio.studioTypes && studio.studioTypes.length > 0 && studio.studioTypes[0] ? studio.studioTypes[0].studioType : 'VOICEOVER',
      createdAt: studio.createdAt,
      owner: {
        displayName: studio.owner.displayName,
      },
    })),
    reviews: recentReviews,
  };

  return (
    <AdminDashboard 
      stats={stats}
      recentActivity={recentActivity}
    />
  );
}

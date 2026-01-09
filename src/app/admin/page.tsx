import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role, UserStatus } from '@prisma/client';
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
    activeStudios,
    verifiedStudios,
    featuredStudios,
    activeUsers30d,
    totalPayments,
    totalPaymentAmount,
    recentPaymentAmount,
    pendingReservations,
    expiredReservations,
    totalIssues,
    openIssues,
    totalSuggestions,
    openSuggestions,
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
    
    // Total payments count
    db.payments.count(),
    
    // Total payment amount (sum of all succeeded payments in pence)
    db.payments.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amount: true },
    }).then(result => result._sum.amount || 0),
    
    // Recent payment amount (last 30 days, succeeded payments in pence)
    db.payments.aggregate({
      where: {
        status: 'SUCCEEDED',
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { amount: true },
    }).then(result => result._sum.amount || 0),
    
    // Pending reservations
    db.users.count({ where: { status: UserStatus.PENDING } }),
    
    // Expired reservations
    db.users.count({ where: { status: UserStatus.EXPIRED } }),
    
    // Total issues
    db.support_tickets.count({ where: { type: 'ISSUE' } }),
    
    // Open issues
    db.support_tickets.count({
      where: {
        type: 'ISSUE',
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
    
    // Total suggestions
    db.support_tickets.count({ where: { type: 'SUGGESTION' } }),
    
    // Open suggestions
    db.support_tickets.count({
      where: {
        type: 'SUGGESTION',
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    }),
  ]);

  const stats = {
    totalUsers,
    totalStudios,
    activeStudios,
    verifiedStudios,
    featuredStudios,
    activeUsers30d,
    totalPayments,
    totalPaymentAmount,
    recentPaymentAmount,
    pendingReservations,
    totalReservations: pendingReservations + expiredReservations,
    totalIssues,
    openIssues,
    totalSuggestions,
    openSuggestions,
  };

  return (
    <AdminDashboard 
      stats={stats}
    />
  );
}

import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role, UserStatus } from '@prisma/client';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Voiceover Studio Finder',
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

  // Fetch insights data for charts
  const [
    locationData,
    studioTypesData,
    signupsLast30d,
    paymentsLast30d,
  ] = await Promise.all([
    // Location/country distribution
    db.studio_profiles.findMany({
      where: {
        location: { not: null },
        status: 'ACTIVE',
      },
      select: { location: true },
    }),

    // Studio types distribution - get all studio types with studio IDs to calculate combinations
    db.studio_studio_types.findMany({
      select: {
        studio_id: true,
        studio_type: true,
      },
    }),

    // Signups in last 30 days (for trend chart)
    db.users.findMany({
      where: {
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { created_at: true },
    }),

    // Payments in last 30 days (for trend chart)
    db.payments.findMany({
      where: {
        status: 'SUCCEEDED',
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { 
        created_at: true,
        amount: true,
      },
    }),
  ]);

  // Aggregate location data (top 4 + other for pie chart)
  const locationMap = new Map<string, number>();
  locationData.forEach(profile => {
    const loc = profile.location?.trim();
    if (loc) {
      locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
    }
  });
  const sortedLocations = Array.from(locationMap.entries())
    .sort((a, b) => b[1] - a[1]);
  const top4Locations = sortedLocations.slice(0, 4);
  const otherLocationsCount = sortedLocations.slice(4).reduce((sum, [, count]) => sum + count, 0);
  const locationStats = top4Locations.map(([name, count]) => ({ name, count }));
  if (otherLocationsCount > 0) {
    locationStats.push({ name: 'Other', count: otherLocationsCount });
  }

  // Studio types data - filter to only RECORDING, HOME, and PODCAST (active types)
  const allowedTypes = new Set(['RECORDING', 'HOME', 'PODCAST']);
  
  // Helper function to format studio type enum to display name
  const formatStudioTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'HOME': 'Home',
      'RECORDING': 'Recording',
      'PODCAST': 'Podcast',
    };
    return typeMap[type] || type;
  };
  
  const filteredStudioTypesData = studioTypesData.filter(item => 
    allowedTypes.has(item.studio_type)
  );
  
  const studioTypeMap = new Map<string, number>();
  const studioTypeCombinations = new Map<string, number>();
  
  // Group by studio_id to get combinations (only for allowed types)
  const studiosByType = new Map<string, Set<string>>();
  filteredStudioTypesData.forEach(item => {
    // Count individual types (using formatted names)
    const formattedName = formatStudioTypeName(item.studio_type);
    studioTypeMap.set(formattedName, (studioTypeMap.get(formattedName) || 0) + 1);
    
    // Track which studios have which types (keep enum values for sorting)
    if (!studiosByType.has(item.studio_id)) {
      studiosByType.set(item.studio_id, new Set());
    }
    studiosByType.get(item.studio_id)!.add(item.studio_type);
  });
  
  // Calculate combinations (only for allowed types)
  studiosByType.forEach((types) => {
    // Filter to only allowed types
    const filteredTypes = Array.from(types).filter(t => allowedTypes.has(t));
    if (filteredTypes.length > 1) {
      // Sort types in consistent order: HOME, PODCAST, RECORDING
      const typeOrder: Record<string, number> = { 'HOME': 1, 'PODCAST': 2, 'RECORDING': 3 };
      const sortedTypes = filteredTypes.sort((a, b) => (typeOrder[a] || 999) - (typeOrder[b] || 999));
      // Format combination with " & " separator
      const combination = sortedTypes.map(t => formatStudioTypeName(t)).join(' & ');
      studioTypeCombinations.set(combination, (studioTypeCombinations.get(combination) || 0) + 1);
    }
  });
  
  // Combine individual types and combinations into one array
  const allStudioTypeData: Array<{ name: string; count: number }> = [];
  
  // Add individual types
  Array.from(studioTypeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .forEach(item => allStudioTypeData.push(item));
  
  // Add combinations
  Array.from(studioTypeCombinations.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .forEach(item => allStudioTypeData.push(item));
  
  // Sort all data by count (descending)
  const studioTypeStats = allStudioTypeData.sort((a, b) => b.count - a.count);
  
  // Keep combinations separate for backwards compatibility (but will be empty/ignored)
  const studioTypeCombinationsStats: Array<{ name: string; count: number }> = [];

  // Signups per day (last 30 days)
  const signupsByDay = new Map<string, number>();
  const now = new Date();
  // Initialize all 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0]!;
    signupsByDay.set(dateKey, 0);
  }
  // Fill in actual signup counts
  signupsLast30d.forEach(user => {
    const dateKey = user.created_at.toISOString().split('T')[0]!;
    signupsByDay.set(dateKey, (signupsByDay.get(dateKey) || 0) + 1);
  });
  const signupTrend = Array.from(signupsByDay.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Payments per day (last 30 days) - both count and amount
  const paymentsByDay = new Map<string, { count: number; amount: number }>();
  // Initialize all 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0]!;
    paymentsByDay.set(dateKey, { count: 0, amount: 0 });
  }
  // Fill in actual payment data
  paymentsLast30d.forEach(payment => {
    const dateKey = payment.created_at.toISOString().split('T')[0]!;
    const current = paymentsByDay.get(dateKey) || { count: 0, amount: 0 };
    paymentsByDay.set(dateKey, {
      count: current.count + 1,
      amount: current.amount + payment.amount,
    });
  });
  const paymentTrend = Array.from(paymentsByDay.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    amount: data.amount,
  }));

  // Fetch recent activity data
  const [
    recentUsers,
    recentPayments,
    recentStudios,
    recentReviews,
    usersWithCustomConnections,
    customConnectionsList,
  ] = await Promise.all([
    // Recent users (last 20) with studio info
    db.users.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        studio_profiles: {
          select: {
            id: true,
            name: true,
            city: true,
            status: true,
            is_verified: true,
            is_featured: true,
          },
        },
      },
    }),

    // Recent payments (last 15) with user info
    db.payments.findMany({
      take: 15,
      orderBy: { created_at: 'desc' },
      where: { status: 'SUCCEEDED' },
      select: {
        id: true,
        amount: true,
        currency: true,
        created_at: true,
        users: {
          select: {
            id: true,
            username: true,
            display_name: true,
          },
        },
      },
    }),

    // Recent studio updates (last 15)
    db.studio_profiles.findMany({
      take: 15,
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        name: true,
        city: true,
        status: true,
        is_verified: true,
        is_featured: true,
        updated_at: true,
        created_at: true,
        users: {
          select: {
            username: true,
            display_name: true,
          },
        },
      },
    }),

    // Recent reviews (last 10)
    db.reviews.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        studio_profiles: {
          select: {
            name: true,
          },
        },
        users_reviews_reviewer_idTousers: {
          select: {
            username: true,
            display_name: true,
          },
        },
      },
    }),

    // Studios with custom connections
    db.studio_profiles.findMany({
      where: {
        custom_connection_methods: {
          isEmpty: false,
        },
      },
      select: {
        custom_connection_methods: true,
        name: true,
        updated_at: true,
        users: {
          select: {
            username: true,
            display_name: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 20,
    }),

    // Get all unique custom connection methods
    db.studio_profiles.findMany({
      where: {
        custom_connection_methods: {
          isEmpty: false,
        },
      },
      select: {
        custom_connection_methods: true,
      },
    }),
  ]);

  // Aggregate custom connections
  const customConnectionsMap = new Map<string, number>();
  customConnectionsList.forEach(profile => {
    profile.custom_connection_methods.forEach(method => {
      if (method && method.trim()) {
        customConnectionsMap.set(method.trim(), (customConnectionsMap.get(method.trim()) || 0) + 1);
      }
    });
  });
  const customConnectionsStats = Array.from(customConnectionsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

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
      insights={{
        customConnectionsStats,
        locationStats,
        studioTypeStats,
        studioTypeCombinationsStats,
        signupTrend,
        paymentTrend,
      }}
      recentActivity={{
        users: recentUsers.map(user => ({
          ...user,
          studio_profiles: user.studio_profiles ? [user.studio_profiles] : null,
        })),
        payments: recentPayments,
        studios: recentStudios,
        reviews: recentReviews,
        customConnections: usersWithCustomConnections,
        customConnectionsStats,
      }}
    />
  );
}

import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { WaitlistTable } from '@/components/admin/WaitlistTable';
import { AdminTabs } from '@/components/admin/AdminTabs';

export const metadata: Metadata = {
  title: 'Waitlist - Admin Dashboard - Voiceover Studio Finder',
  description: 'View waitlist entries',
};

export default async function AdminWaitlistPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  // Fetch all waitlist entries
  const waitlistEntries = await db.waitlist.findMany({
    orderBy: { created_at: 'desc' },
  });

  // Group by type for stats
  const generalCount = waitlistEntries.filter(e => e.type === 'GENERAL').length;
  const featuredCount = waitlistEntries.filter(e => e.type === 'FEATURED').length;

  return (
    <>
      <AdminTabs activeTab="waitlist" />
      <div className="px-4 py-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Waitlist Management</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              View and manage users who have joined the waitlist
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 md:mb-6">
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-3xl font-bold text-gray-900">{waitlistEntries.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Featured Waitlist</p>
                  <p className="text-3xl font-bold text-gray-900">{featuredCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">General Waitlist</p>
                  <p className="text-3xl font-bold text-gray-900">{generalCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Waitlist Table */}
          <WaitlistTable entries={waitlistEntries} />
        </div>
      </div>
    </>
  );
}


import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { db } from '@/lib/db';
import { WaitlistTable } from '@/components/admin/WaitlistTable';
import { AdminTabs } from '@/components/admin/AdminTabs';

export const metadata: Metadata = {
  title: 'Waitlist - Admin Dashboard - VoiceoverStudioFinder',
  description: 'View waitlist entries',
};

export default async function AdminWaitlistPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  // Fetch all waitlist entries
  const waitlistEntries = await db.waitlist.findMany({
    orderBy: { created_at: 'desc' },
  });

  return (
    <>
      <AdminTabs activeTab="waitlist" />
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Waitlist Management</h1>
            <p className="text-gray-600 mt-2">
              View and manage users who have joined the waitlist
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Waitlist Entries</p>
              <p className="text-3xl font-bold text-gray-900">{waitlistEntries.length}</p>
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


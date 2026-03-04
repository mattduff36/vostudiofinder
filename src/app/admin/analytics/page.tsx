import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { getAnalyticsDetail } from '@/lib/vercel-analytics';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics - Voiceover Studio Finder Admin',
  description: 'Site visitor analytics powered by Vercel Web Analytics',
};

export default async function AnalyticsPage() {
  await requireRole(Role.ADMIN);

  const result = await getAnalyticsDetail();

  return (
    <>
      <AdminTabs activeTab="analytics" />
      <div className="px-4 py-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
              Site visitor analytics powered by Vercel Web Analytics (production only)
            </p>
          </div>

          {result.ok ? (
            <AnalyticsDashboard data={result.data} />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 md:p-12">
              <div className="max-w-lg mx-auto text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {result.configured ? 'Analytics Unavailable' : 'Analytics Not Configured'}
                </h2>
                <p className="text-gray-600 mb-6">{result.error}</p>
                {!result.configured && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700">
                    <p className="font-semibold mb-2">Required environment variables:</p>
                    <ul className="space-y-1 font-mono text-xs">
                      <li>VERCEL_API_TOKEN</li>
                      <li>VERCEL_TEAM_ID</li>
                      <li>VERCEL_PROJECT_ID</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

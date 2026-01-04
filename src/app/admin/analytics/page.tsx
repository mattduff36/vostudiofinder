'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { BarChart3, TrendingUp, Users, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <>
      <AdminTabs activeTab="analytics" />
      <div className="p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">
              Advanced analytics and insights powered by Google Analytics
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-lg shadow p-12">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex justify-center gap-4 mb-6">
                <div className="p-4 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <div className="p-4 bg-green-100 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <div className="p-4 bg-purple-100 rounded-lg">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <div className="p-4 bg-orange-100 rounded-lg">
                  <Activity className="w-8 h-8 text-orange-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Google Analytics Integration Coming Soon
              </h2>
              
              <p className="text-gray-600 mb-8">
                This page will display comprehensive analytics including page views, user behavior, 
                traffic sources, geographic data, and more powered by Google Analytics 4.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Planned Metrics:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                    Real-time visitors and active sessions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Page views and engagement metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                    Traffic sources and referrals
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                    Geographic distribution
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-pink-600 rounded-full"></div>
                    Device and browser breakdown
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                    Conversion tracking
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

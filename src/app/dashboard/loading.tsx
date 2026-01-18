/**
 * Dashboard Loading Component
 * Shown during dashboard route transitions
 */

import Image from 'next/image';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen relative bg-gray-50 flex flex-col">
      {/* Background Image - Matching dashboard layout */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Dashboard background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/60 hidden md:block" />
      </div>

      {/* Centered Loader */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );
}

import { Metadata } from 'next';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminNavigation from '@/components/admin/AdminNavigation';

export const metadata: Metadata = {
  title: 'Admin Dashboard - VoiceoverStudioFinder',
  description: 'Administrative interface for VoiceoverStudioFinder',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-secondary-50">
        <AdminNavigation />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}

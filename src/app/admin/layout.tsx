import { Metadata } from 'next';
import AdminGuard from '@/components/admin/AdminGuard';

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
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </AdminGuard>
  );
}

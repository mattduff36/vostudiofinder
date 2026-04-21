import AdminGuard from '@/components/admin/AdminGuard';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Admin Dashboard - Voiceover Studio Finder',
  description: 'Administrative interface for Voiceover Studio Finder.',
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-72px)]" style={{ backgroundColor: '#53282a17' }}>
        {children}
      </div>
    </AdminGuard>
  );
}

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireActiveAccount } from '@/lib/auth-guards';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { loadDashboardData } from '@/lib/dashboard-data';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Edit Profile - Dashboard',
  description: 'Edit your studio profile',
};

export default async function EditProfilePage() {
  const session = await requireActiveAccount();
  
  // Check if request is from desktop (has viewport width hint from client)
  // For server-side, we'll render both: desktop gets redirect via client component,
  // mobile gets the regular page. This keeps mobile behavior unchanged.
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // Simple mobile detection - if it's clearly mobile, show the page
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  
  // If desktop, redirect to profile with hash (happens on server or via client check)
  if (!isMobile && session.user.username) {
    redirect(`/${session.user.username}#edit-profile`);
  }
  
  // Mobile: show the existing page
  const { dashboardData, initialProfileData } = await loadDashboardData(session.user.id);

  return <DashboardContent dashboardData={dashboardData} initialProfileData={initialProfileData} activeTab="edit-profile" />;
}

import { Metadata } from 'next';
import { requireActiveAccount } from '@/lib/auth-guards';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { loadDashboardData } from '@/lib/dashboard-data';
import { headers } from 'next/headers';
import { EditProfileRedirect } from '@/components/dashboard/EditProfileRedirect';

export const metadata: Metadata = {
  title: 'Edit Profile - Dashboard',
  description: 'Edit your studio profile',
};

export default async function EditProfilePage() {
  const session = await requireActiveAccount();
  
  // Check if request is from mobile device
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // Simple mobile detection - if it's clearly mobile, show the page
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  
  // If desktop, render a client component that opens the modal and redirects to dashboard
  if (!isMobile) {
    return <EditProfileRedirect />;
  }
  
  // Mobile: show the existing page
  const { dashboardData, initialProfileData } = await loadDashboardData(session.user.id);

  return <DashboardContent dashboardData={dashboardData} initialProfileData={initialProfileData} activeTab="edit-profile" />;
}

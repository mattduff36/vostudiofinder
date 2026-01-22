import { Metadata } from 'next';
import { requireActiveAccount } from '@/lib/auth-guards';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { loadDashboardData } from '@/lib/dashboard-data';

export const metadata: Metadata = {
  title: 'Edit Profile - Dashboard',
  description: 'Edit your studio profile',
};

export default async function EditProfilePage() {
  const session = await requireActiveAccount();
  const { dashboardData, initialProfileData } = await loadDashboardData(session.user.id);

  return <DashboardContent dashboardData={dashboardData} initialProfileData={initialProfileData} activeTab="edit-profile" />;
}

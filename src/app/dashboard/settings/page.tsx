import { Metadata } from 'next';
import { requireActiveAccount } from '@/lib/auth-guards';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { loadDashboardData } from '@/lib/dashboard-data';

export const metadata: Metadata = {
  title: 'Settings - Dashboard',
  description: 'Manage your account settings',
};

export default async function SettingsPage() {
  const session = await requireActiveAccount();
  const { dashboardData, initialProfileData } = await loadDashboardData(session.user.id);

  return <DashboardContent dashboardData={dashboardData} initialProfileData={initialProfileData} activeTab="settings" />;
}

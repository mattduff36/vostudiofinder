import { Metadata } from 'next';
import { requireActiveAccount } from '@/lib/auth-guards';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { loadDashboardData } from '@/lib/dashboard-data';

export const metadata: Metadata = {
  title: 'Dashboard - Voiceover Studio Finder',
  description: 'Manage your profile, studios, and activities',
};

export default async function DashboardPage() {
  const session = await requireActiveAccount();
  const { dashboardData, initialProfileData } = await loadDashboardData(session.user.id);

  return <DashboardContent dashboardData={dashboardData} initialProfileData={initialProfileData} activeTab="overview" />;
}

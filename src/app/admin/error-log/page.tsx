import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { ErrorLog } from '@/components/admin/ErrorLog';

export const metadata: Metadata = {
  title: 'Error Log - Admin | Voiceover Studio Finder',
  description: 'Monitor and review site-wide errors',
};

export default async function AdminErrorLogPage() {
  // Ensure user has admin permissions
  await requireRole(Role.ADMIN);

  return <ErrorLog />;
}

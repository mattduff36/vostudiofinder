import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SupportTickets } from '@/components/admin/SupportTickets';

export const metadata: Metadata = {
  title: 'Support Tickets - Admin | Voiceover Studio Finder',
  description: 'Manage user support tickets and feedback',
};

export default async function AdminSupportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Check if user is admin (match API authorization)
  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return <SupportTickets />;
}


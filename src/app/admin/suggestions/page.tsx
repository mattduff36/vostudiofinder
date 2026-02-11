import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Suggestions } from '@/components/admin/Suggestions';

export const metadata: Metadata = {
  title: 'Suggestions - Admin | Voiceover Studio Finder',
  description: 'Review user suggestions and feature requests',
};

export default async function AdminSuggestionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return <Suggestions />;
}

import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Profile Settings - VoiceoverStudioFinder',
  description: 'Manage your profile information and account settings',
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/profile');
  }

  // Fetch fresh user data
  const user = await db.users.findUnique({
    where: { id: session.user.id },
    select: {
      display_name: true,
      username: true,
      avatar_url: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Profile Settings</h1>
          <p className="mt-2 text-text-secondary">
            Manage your account information and preferences
          </p>
        </div>

        <ProfileForm
          initialData={{
            display_name: user?.display_name || session.user.display_name,
            username: user?.username || session.user.username,
            avatar_url: user?.avatar_url || session.user.avatar_url,
          }}
        />
      </div>
    </div>
  );
}


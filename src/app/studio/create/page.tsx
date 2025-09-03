import { Metadata } from 'next';
import { requireRole } from '@/lib/auth-guards';
import { Role } from '@prisma/client';
import { StudioForm } from '@/components/studio/StudioForm';

export const metadata: Metadata = {
  title: 'Create Studio - VoiceoverStudioFinder',
  description: 'Add your recording studio to VoiceoverStudioFinder',
};

export default async function CreateStudioPage() {
  // Ensure user has studio owner permissions
  await requireRole(Role.STUDIO_OWNER);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Create Studio Profile</h1>
          <p className="mt-2 text-text-secondary">
            Add your recording studio to VoiceoverStudioFinder and connect with voice professionals worldwide.
          </p>
        </div>

        <StudioForm />
      </div>
    </div>
  );
}

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { StudioForm } from '@/components/studio/StudioForm';

interface EditStudioPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: EditStudioPageProps): Promise<Metadata> {
  const { username } = await params;
  
  return {
    title: `Edit Studio - ${username} | VoiceoverStudioFinder`,
    description: `Edit your studio profile on VoiceoverStudioFinder`,
  };
}

export default async function EditStudioPage({ params }: EditStudioPageProps) {
  const { username } = await params;
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated
  if (!session) {
    redirect('/auth/signin');
  }

  // Find user by username and get their studio
  const user = await db.users.findUnique({
    where: { username },
    include: {
      studios: {
      where: { status: 'ACTIVE' },
      include: {
        studio_images: {
          orderBy: { sort_order: 'asc' },
        },
        studio_services: {
            select: {
              service: true,
            },
          },
          studio_studio_types: {
            select: {
              studio_type: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Check if user is the owner of this studio
  if (user.id !== session.user.id) {
    redirect('/unauthorized');
  }

  // Check if user has a studio
  if (!user.studios || user.studios.length === 0) {
    redirect('/studio/create');
  }

  const studio = user.studios[0]!; // We know this exists because we checked length > 0

  // Prepare initial data for the form
  const initialData = {
    id: studio.id,
    name: studio.name,
    description: studio.description || '',
    studioTypes: studio.studioTypes?.map(st => st.studioType) || [],
    address: studio.address || '',
    websiteUrl: studio.websiteUrl || '',
    phone: studio.phone || '',
    latitude: studio.latitude ? Number(studio.latitude) : null,
    longitude: studio.longitude ? Number(studio.longitude) : null,
    images: studio.images?.map(img => ({
      id: img.id,
      url: img.imageUrl,
      altText: img.altText || '',
      sortOrder: img.sortOrder,
    })) || [],
    services: studio.services?.map(s => s.service) || [],
    owner: {
      username: user.username,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Edit Studio Profile</h1>
          <p className="mt-2 text-text-secondary">
            Update your recording studio information on VoiceoverStudioFinder.
          </p>
        </div>

        <StudioForm initialData={initialData} isEditing={true} />
      </div>
    </div>
  );
}

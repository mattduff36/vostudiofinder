import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { StudioProfile } from '@/components/studio/profile/StudioProfile';

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: StudioPageProps): Promise<Metadata> {
  const { id } = await params;
  
  const studio = await db.studio.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      address: true,
      images: {
        take: 1,
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!studio) {
    return {
      title: 'Studio Not Found - VoiceoverStudioFinder',
    };
  }

  return {
    title: `${studio.name} - Recording Studio | VoiceoverStudioFinder`,
    description: studio.description.substring(0, 160),
    keywords: `recording studio, ${studio.name}, voiceover, audio production, ${studio.address}`,
    openGraph: {
      title: studio.name,
      description: studio.description,
      type: 'business.business',
      images: studio.images?.[0]?.imageUrl ? [studio.images[0].imageUrl] : [],
    },
  };
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { id } = await params;

  const studio = await db.studio.findUnique({
    where: { 
      id,
      status: 'ACTIVE',
    },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      },
      services: {
        select: {
          service: true,
        },
      },
      images: {
        orderBy: { sortOrder: 'asc' },
      },
      reviews: {
        where: { status: 'APPROVED' },
        include: {
          reviewer: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          reviews: {
            where: { status: 'APPROVED' },
          },
        },
      },
    },
  });

  if (!studio) {
    notFound();
  }

  // Calculate average rating
  const averageRating = studio.reviews.length > 0
    ? studio.reviews.reduce((sum, review) => sum + review.rating, 0) / studio.reviews.length
    : 0;

  return (
    <StudioProfile 
      studio={{
        ...studio,
        averageRating,
      }}
    />
  );
}

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

  // Generate structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://voiceoverstudiofinder.com/studio/${studio.id}`,
    name: studio.name,
    description: studio.description,
    url: `https://voiceoverstudiofinder.com/studio/${studio.id}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: studio.address,
      addressCountry: 'GB',
    },
    geo: studio.latitude && studio.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: studio.latitude,
      longitude: studio.longitude,
    } : undefined,
    aggregateRating: studio.reviews.length > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(1),
      reviewCount: studio.reviews.length,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    review: studio.reviews.slice(0, 5).map((review) => ({
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        '@type': 'Person',
        name: review.reviewer.displayName,
      },
      reviewBody: review.comment,
      datePublished: review.createdAt.toISOString(),
    })),
    image: studio.images.map((img) => img.imageUrl),
    priceRange: '$$',
    serviceType: 'Audio Recording Studio',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <StudioProfile 
        studio={{
          ...studio,
          averageRating,
        }}
      />
    </>
  );
}

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ModernStudioProfile } from '@/components/studio/profile/ModernStudioProfile';
import { EnhancedUserProfile } from '@/components/profile/EnhancedUserProfile';

interface UsernamePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const { username } = await params;
  
  // Find user by username and get their studio
  const user = await db.user.findUnique({
    where: { username },
    select: {
      displayName: true,
      studios: {
        where: { status: 'ACTIVE' },
        select: {
          name: true,
          description: true,
          address: true,
          images: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
          },
        },
        take: 1, // Assuming one studio per user
      },
    },
  });

  if (!user || !user.studios.length) {
    return {
      title: 'Studio Not Found - VoiceoverStudioFinder',
    };
  }

  const studio = user.studios[0];
  if (!studio) {
    return {
      title: 'Studio Not Found - VoiceoverStudioFinder',
    };
  }

  return {
    title: `${studio.name} - Recording Studio | VoiceoverStudioFinder`,
    description: studio.description?.substring(0, 160) || `${studio.name} recording studio`,
    keywords: `recording studio, ${studio.name}, voiceover, audio production, ${studio.address}`,
    openGraph: {
      title: studio.name,
      description: studio.description || `${studio.name} recording studio`,
      type: 'website',
      images: studio.images?.[0]?.imageUrl ? [studio.images[0].imageUrl] : [],
    },
  };
}

export default async function UsernamePage({ params }: UsernamePageProps) {
  const { username } = await params;

  // Find user by username and get their full profile with metadata
  const user = await db.user.findUnique({
    where: { username },
    include: {
      profile: true,
      metadata: true,
      studios: {
        where: { status: 'ACTIVE' },
        include: {
          owner: {
            include: {
              profile: true,
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
            select: {
              id: true,
              rating: true,
              content: true,
              isAnonymous: true,
              createdAt: true,
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
      },
    },
  });

  if (!user) {
    notFound();
  }

  // If user has a studio, show studio profile, otherwise show user profile
  const hasStudio = user.studios && user.studios.length > 0;
  
  if (hasStudio) {
    const studio = user.studios[0];
    
    if (!studio) {
      return <div>Studio not found</div>;
    }

    // Calculate average rating
    const averageRating = studio.reviews.length > 0
      ? studio.reviews.reduce((sum, review) => sum + review.rating, 0) / studio.reviews.length
      : 0;

    // Generate structured data for SEO
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `https://voiceoverstudiofinder.com/${username}`,
      name: studio.name,
      description: studio.description,
      url: `https://voiceoverstudiofinder.com/${username}`,
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
        reviewBody: review.content,
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
        <ModernStudioProfile 
          studio={{
            ...(() => {
              const { websiteUrl: _, phone: __, latitude: ___, longitude: ____, images: _____, reviews: ______, owner: _______, ...rest } = studio;
              return rest;
            })(),
            description: studio.description || '',
            address: studio.address || '',
            owner: {
              ...studio.owner,
              avatarUrl: studio.owner.avatarUrl || '',
              profile: studio.owner.profile ? {
                studioName: studio.owner.profile.studioName,
                lastName: studio.owner.profile.lastName,
                phone: studio.owner.profile.phone,
                about: studio.owner.profile.about,
                shortAbout: studio.owner.profile.shortAbout,
                location: studio.owner.profile.location,
                rateTier1: studio.owner.profile.rateTier1,
                rateTier2: studio.owner.profile.rateTier2,
                rateTier3: studio.owner.profile.rateTier3,
                showRates: studio.owner.profile.showRates,
                facebookUrl: studio.owner.profile.facebookUrl,
                twitterUrl: studio.owner.profile.twitterUrl,
                linkedinUrl: studio.owner.profile.linkedinUrl,
                instagramUrl: studio.owner.profile.instagramUrl,
                youtubeUrl: studio.owner.profile.youtubeUrl,
                vimeoUrl: studio.owner.profile.vimeoUrl,
                soundcloudUrl: studio.owner.profile.soundcloudUrl,
                isCrbChecked: studio.owner.profile.isCrbChecked,
                isFeatured: studio.owner.profile.isFeatured,
                isSpotlight: studio.owner.profile.isSpotlight,
                verificationLevel: studio.owner.profile.verificationLevel,
                homeStudioDescription: studio.owner.profile.homeStudioDescription,
                equipmentList: studio.owner.profile.equipmentList,
                servicesOffered: studio.owner.profile.servicesOffered,
                showEmail: studio.owner.profile.showEmail,
                showPhone: studio.owner.profile.showPhone,
                showAddress: studio.owner.profile.showAddress,
              } : null,
            },
            ...(studio.websiteUrl ? { websiteUrl: studio.websiteUrl } : {}),
            ...(studio.phone ? { phone: studio.phone } : {}),
            ...(studio.latitude ? { latitude: Number(studio.latitude) } : {}),
            ...(studio.longitude ? { longitude: Number(studio.longitude) } : {}),
            images: studio.images.map(img => ({
              id: img.id,
              imageUrl: img.imageUrl,
              sortOrder: img.sortOrder,
              ...(img.altText ? { altText: img.altText } : {}),
            })),
            reviews: studio.reviews.map(review => ({
              id: review.id,
              rating: review.rating,
              content: review.content || '',
              createdAt: review.createdAt,
              reviewer: {
                displayName: review.reviewer.displayName,
              },
            })),
            averageRating,
          }}
        />
      </>
    );
  } else {
    // Show enhanced user profile
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <EnhancedUserProfile user={user} />
        </div>
      </div>
    );
  }
}

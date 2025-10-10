import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ModernStudioProfileV3 } from '@/components/studio/profile/ModernStudioProfileV3';
import { EnhancedUserProfile } from '@/components/profile/EnhancedUserProfile';

interface UsernamePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const { username } = await params;
  
  // Find user by username and get their studio
  const user = await db.users.findUnique({
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
      images: studio.studio_images?.[0]?.image_url ? [studio.studio_images[0].image_url] : [],
    },
  };
}

export default async function UsernamePage({ params }: UsernamePageProps) {
  const { username } = await params;

  // Find user by username and get their full profile with metadata
  const user = await db.users.findUnique({
    where: { username },
    include: {
      user_profiles: true,
      user_metadata: true,
      studios: {
        where: { status: 'ACTIVE' },
        include: {
          users: {
            include: {
              user_profiles: true,
            },
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
          studio_images: {
            orderBy: { sort_order: 'asc' },
          },
          reviews: {
            where: { status: 'APPROVED' },
            select: {
              id: true,
              rating: true,
              content: true,
              is_anonymous: true,
              created_at: true,
              users_reviews_reviewer_idTousers: {
                select: {
                  display_name: true,
                  avatar_url: true,
                },
              },
            },
            orderBy: { created_at: 'desc' },
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
          name: review.users_reviews_reviewer_idTousers.display_name,
        },
        reviewBody: review.content,
        datePublished: review.created_at.toISOString(),
      })),
      image: studio.studio_images.map((img) => img.image_url),
      priceRange: '$$',
      serviceType: 'Audio Recording Studio',
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ModernStudioProfileV3 
          studio={{
            ...(() => {
              const { websiteUrl: _, phone: __, latitude: ___, longitude: ____, images: _____, reviews: ______, owner: _______, studioTypes: ________, ...rest } = studio;
              return rest;
            })(),
            description: studio.description || '',
            address: studio.address || '',
            studioTypes: studio.studio_studio_types && studio.studio_studio_types.length > 0 
              ? studio.studio_studio_types.map(st => st.studio_type) 
              : ['VOICEOVER'],
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
            images: studio.studio_images.map(img => ({
              id: img.id,
              imageUrl: img.image_url,
              sortOrder: img.sort_order,
              ...(img.alt_text ? { altText: img.alt_text } : {}),
            })),
            reviews: studio.reviews.map(review => ({
              id: review.id,
              rating: review.rating,
              content: review.content || '',
              createdAt: review.created_at,
              reviewer: {
                displayName: review.users_reviews_reviewer_idTousers.display_name,
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

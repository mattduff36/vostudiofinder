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
  
  // Find user by username and get their studio with profile data
  const user = await db.users.findUnique({
    where: { username },
    select: {
      display_name: true,
      user_profiles: {
        select: {
          short_about: true,
          twitter_url: true,
        },
      },
      studios: {
        where: { status: 'ACTIVE' },
        select: {
          name: true,
          description: true,
          address: true,
          full_address: true,
          abbreviated_address: true,
          studio_images: {
            take: 1,
            orderBy: { sort_order: 'asc' },
            select: {
              image_url: true,
            },
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
  const profile = user.user_profiles;
  
  if (!studio) {
    return {
      title: 'Studio Not Found - VoiceoverStudioFinder',
    };
  }

  // Construct the full page URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://voiceoverstudiofinder.com';
  const pageUrl = `${baseUrl}/${username}`;

  // Use short_about if available, otherwise fall back to description
  const description = profile?.short_about || studio.description?.substring(0, 160) || `${studio.name} recording studio`;

  // Use first image or fallback to logo
  const ogImage = studio.studio_images?.[0]?.image_url || `${baseUrl}/images/voiceover-studio-finder-header-logo2-black.png`;

  // Check if user has Twitter handle
  const hasTwitter = profile?.twitter_url && profile.twitter_url.trim().length > 0;

  const metadata: Metadata = {
    title: `${studio.name} - Recording Studio | VoiceoverStudioFinder`,
    description: description,
    keywords: `recording studio, ${studio.name}, voiceover, audio production, ${studio.abbreviated_address || studio.full_address || studio.address || ''}`,
    openGraph: {
      title: studio.name,
      description: description,
      type: 'website',
      url: pageUrl,
      siteName: 'VoiceoverStudioFinder',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${studio.name} - Recording Studio`,
        },
      ],
    },
  };

  // Only add Twitter metadata if user has a Twitter handle
  if (hasTwitter) {
    metadata.twitter = {
      card: 'summary_large_image',
      title: studio.name,
      description: description,
      images: [ogImage],
    };
  }

  return metadata;
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

    // If profile is hidden, show the simplified user profile with hidden message
    if (studio.is_profile_visible === false) {
      // Serialize user data to avoid Decimal serialization issues
      const serializedUser = {
        ...user,
        studios: user.studios.map(s => ({
          ...s,
          status: s.status,
          is_profile_visible: s.is_profile_visible,
          latitude: s.latitude ? Number(s.latitude) : null,
          longitude: s.longitude ? Number(s.longitude) : null,
        }))
      };
      
      return (
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <EnhancedUserProfile user={serializedUser as any} isHidden={true} />
          </div>
        </div>
      );
    }

    // Calculate average rating
    const averageRating = studio.reviews.length > 0
      ? studio.reviews.reduce((sum, review) => sum + review.rating, 0) / studio.reviews.length
      : 0;

    // Get base URL from environment or use default
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://voiceoverstudiofinder.com';
    const pageUrl = `${baseUrl}/${username}`;

    // Get description from user_profiles.short_about with fallback
    const businessDescription = user.user_profiles?.short_about || 
                                studio.description || 
                                'Voiceover recording studio available for hire in the UK.';

    // Generate structured data for SEO (LocalBusiness schema)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': pageUrl,
      name: studio.name,
      description: businessDescription,
      url: pageUrl,
      address: (studio.full_address || studio.address) ? {
        '@type': 'PostalAddress',
        streetAddress: studio.full_address || studio.address || '',
        addressCountry: 'GB',
      } : undefined,
      geo: studio.latitude && studio.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: Number(studio.latitude),
        longitude: Number(studio.longitude),
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
      // Use only the first (main) image
      image: studio.studio_images[0]?.image_url || undefined,
      priceRange: '$$',
    };

    // Remove undefined values from structured data
    const tempData = JSON.parse(JSON.stringify(structuredData, (_key, value) => 
      value === undefined ? null : value
    ));
    Object.keys(tempData).forEach(key => 
      tempData[key] === null && delete tempData[key]
    );

    // Ensure @context is the first property for Google compliance
    const cleanedStructuredData = {
      '@context': 'https://schema.org',
      ...Object.fromEntries(
        Object.entries(tempData).filter(([key]) => key !== '@context')
      )
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanedStructuredData) }}
        />
        <ModernStudioProfileV3 
          studio={({
            ...((): Omit<typeof studio, 'website_url' | 'phone' | 'latitude' | 'longitude' | 'studio_images' | 'reviews' | 'users' | 'studio_studio_types'> => {
              const { website_url: _, phone: __, latitude: ___, longitude: ____, studio_images: _____, reviews: ______, users: _______, studio_studio_types: ________, ...rest } = studio;
              return rest as any;
            })(),
            description: studio.description || '',
            address: studio.address || '', // Legacy field
            full_address: studio.full_address || '',
            abbreviated_address: studio.abbreviated_address || '',
            studio_studio_types: studio.studio_studio_types && studio.studio_studio_types.length > 0 
              ? studio.studio_studio_types.map(st => st.studio_type) 
              : ['VOICEOVER'],
            owner: {
              ...studio.users,
              avatar_url: studio.users.avatar_url || '',
            profile: studio.users.user_profiles ? {
              studio_name: studio.users.user_profiles.studio_name,
              last_name: studio.users.user_profiles.last_name,
              phone: studio.users.user_profiles.phone,
              about: studio.users.user_profiles.about,
              short_about: studio.users.user_profiles.short_about,
              location: studio.users.user_profiles.location,
              rate_tier_1: studio.users.user_profiles.rate_tier_1,
              rate_tier_2: studio.users.user_profiles.rate_tier_2,
              rate_tier_3: studio.users.user_profiles.rate_tier_3,
              show_rates: studio.users.user_profiles.show_rates,
              facebook_url: studio.users.user_profiles.facebook_url,
              twitter_url: studio.users.user_profiles.twitter_url,
              linkedin_url: studio.users.user_profiles.linkedin_url,
              instagram_url: studio.users.user_profiles.instagram_url,
              youtube_url: studio.users.user_profiles.youtube_url,
              vimeo_url: studio.users.user_profiles.vimeo_url,
              soundcloud_url: studio.users.user_profiles.soundcloud_url,
              is_crb_checked: studio.users.user_profiles.is_crb_checked,
              is_featured: studio.users.user_profiles.is_featured,
              is_spotlight: studio.users.user_profiles.is_spotlight,
              verification_level: studio.users.user_profiles.verification_level,
              home_studio_description: studio.users.user_profiles.home_studio_description,
              equipment_list: studio.users.user_profiles.equipment_list,
              services_offered: studio.users.user_profiles.services_offered,
              show_email: studio.users.user_profiles.show_email,
              show_phone: studio.users.user_profiles.show_phone,
              show_address: studio.users.user_profiles.show_address,
              show_directions: studio.users.user_profiles.show_directions,
              use_coordinates_for_map: studio.users.user_profiles.use_coordinates_for_map,
              // Connection types
              connection1: studio.users.user_profiles.connection1,
              connection2: studio.users.user_profiles.connection2,
              connection3: studio.users.user_profiles.connection3,
              connection4: studio.users.user_profiles.connection4,
              connection5: studio.users.user_profiles.connection5,
              connection6: studio.users.user_profiles.connection6,
              connection7: studio.users.user_profiles.connection7,
              connection8: studio.users.user_profiles.connection8,
              connection9: studio.users.user_profiles.connection9,
              connection10: studio.users.user_profiles.connection10,
              connection11: studio.users.user_profiles.connection11,
              connection12: studio.users.user_profiles.connection12,
              custom_connection_methods: studio.users.user_profiles.custom_connection_methods,
            } : null,
            },
            ...(studio.website_url ? { website_url: studio.website_url } : {}),
            ...(studio.phone ? { phone: studio.phone } : {}),
            ...(studio.latitude ? { latitude: Number(studio.latitude) } : {}),
            ...(studio.longitude ? { longitude: Number(studio.longitude) } : {}),
            studio_images: studio.studio_images.map(img => ({
              id: img.id,
              image_url: img.image_url,
              sort_order: img.sort_order,
              alt_text: img.alt_text,
            })),
            reviews: studio.reviews.map(review => ({
              id: review.id,
              rating: review.rating,
              content: review.content || '',
              created_at: review.created_at,
              reviewer: {
                display_name: review.users_reviews_reviewer_idTousers.display_name,
              },
            })),
            averageRating,
          }) as any}
        />
      </>
    );
  } else {
    // Show enhanced user profile
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <EnhancedUserProfile user={user as any} />
        </div>
      </div>
    );
  }
}

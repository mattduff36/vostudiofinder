import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ModernStudioProfileV3 } from '@/components/studio/profile/ModernStudioProfileV3';
import { EnhancedUserProfile } from '@/components/profile/EnhancedUserProfile';
import { getBaseUrl, SITE_NAME } from '@/lib/seo/site';

interface UsernamePageProps {
  params: Promise<{ username: string }>;
}

// Generate static params for all active studio profiles with visible profiles
// Falls back to on-demand rendering if database is unavailable during build
export async function generateStaticParams() {
  try {
    const users = await db.users.findMany({
      where: {
        studio_profiles: {
          status: 'ACTIVE',
          is_profile_visible: true,
        },
      },
      select: {
        username: true,
      },
    });

    return users.map((user) => ({
      username: user.username,
    }));
  } catch (error) {
    console.warn('Could not generate static params for user profiles, falling back to on-demand rendering:', error);
    // Return empty array - pages will be generated on-demand with ISR
    return [];
  }
}

// Revalidate every hour to keep content fresh while maintaining static generation benefits
export const revalidate = 3600;

export async function generateMetadata({ params }: UsernamePageProps): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim();
  
  // Find user by username and get their studio profile data
  const user = await db.users.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: {
      username: true,
      display_name: true,
      studio_profiles: {
        where: { status: 'ACTIVE' },
        select: {
          name: true,
          description: true,
          short_about: true,
          full_address: true,
          abbreviated_address: true,
          city: true,
          phone: true,
          twitter_url: true,
          studio_images: {
            take: 1,
            orderBy: { sort_order: 'asc' },
            select: {
              image_url: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.studio_profiles) {
    return {
      title: `Studio Not Found - ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const studio = user.studio_profiles;
  
  if (!studio) {
    return {
      title: `Studio Not Found - ${SITE_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Construct the full page URL
  const baseUrl = getBaseUrl();
  const canonicalUsername = user.username ?? username;
  const pageUrl = `${baseUrl}/${canonicalUsername}`;

  // Use short_about if available, otherwise fall back to description
  const description = studio?.short_about || studio.description?.substring(0, 160) || `${studio.name} recording studio`;

  // Location-aware description
  const locationSuffix = studio.city ? ` in ${studio.city}` : (studio.abbreviated_address ? ` in ${studio.abbreviated_address}` : '');
  const fullDescription = description.endsWith('.') ? description : `${description}.`;
  const seoDescription = `${fullDescription} Professional voiceover recording studio${locationSuffix}. Book now for your next project.`;

  // Use first image or fallback to logo
  const ogImage = studio.studio_images?.[0]?.image_url || `${baseUrl}/images/voiceover-studio-finder-header-logo2-black.png`;

  // Check if user has Twitter handle
  const hasTwitter = studio?.twitter_url && studio.twitter_url.trim().length > 0;

  // Enhanced keywords with location
  const locationKeywords = studio.city ? `${studio.city} recording studio, ${studio.city} voiceover studio, ` : '';
  const keywords = `${locationKeywords}recording studio, ${studio.name}, voiceover, audio production, professional studio, ${studio.abbreviated_address || studio.full_address || ''}`;

  const metadata: Metadata = {
    title: `${studio.name}${locationSuffix} - Recording Studio | ${SITE_NAME}`,
    description: seoDescription.substring(0, 160),
    keywords: keywords,
    authors: [{ name: studio.name }],
    creator: studio.name,
    publisher: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${studio.name}${locationSuffix}`,
      description: seoDescription.substring(0, 160),
      type: 'website',
      url: pageUrl,
      siteName: SITE_NAME,
      locale: 'en_GB',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${studio.name} - Professional Recording Studio${locationSuffix}`,
        },
      ],
    },
  };

  // Only add Twitter metadata if user has a Twitter handle
  if (hasTwitter && studio.twitter_url) {
    metadata.twitter = {
      card: 'summary_large_image',
      title: `${studio.name}${locationSuffix}`,
      description: seoDescription.substring(0, 160),
      images: [ogImage],
      creator: studio.twitter_url,
    };
  }

  return metadata;
}

export default async function UsernamePage({ params }: UsernamePageProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim();

  // Find user by username and get their studio profile with metadata
  const user = await db.users.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    include: {
      studio_profiles: {
        where: { status: 'ACTIVE' },
        include: {
          users: {
            select: {
              id: true,
              display_name: true,
              username: true,
              avatar_url: true,
              email: true,
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

  // Canonicalize casing/whitespace to the stored username to avoid duplicates and "not found" on mixed casing.
  if (username !== user.username) redirect(`/${user.username}`);

  // If user has a studio profile, show it
  const studioProfile = user.studio_profiles;
  
  if (studioProfile) {
    const studio = studioProfile;
    
    if (!studio) {
      return <div>Studio not found</div>;
    }

    // If profile is hidden, show the simplified user profile with hidden message
    if (studio.is_profile_visible === false) {
      // Serialize user data to avoid Decimal serialization issues
      const serializedUser = {
        ...user,
        studio_profiles: {
          ...studio,
          status: studio.status,
          is_profile_visible: studio.is_profile_visible,
          latitude: studio.latitude ? Number(studio.latitude) : null,
          longitude: studio.longitude ? Number(studio.longitude) : null,
        }
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
    const baseUrl = getBaseUrl();
    const pageUrl = `${baseUrl}/${user.username}`;

    // Get description from studio profile with fallback and content safeguard
    let businessDescription = studio.about || 
                              studio.short_about || 
                              studio.description || 
                              '';
    
    // Content safeguard: Ensure minimum unique content for SEO
    // If description is too short, supplement with contextual information
    const descriptionWordCount = businessDescription.split(/\s+/).length;
    if (descriptionWordCount < 50) {
      const locationContext = studio.city ? ` located in ${studio.city}` : '';
      const servicesContext = studio.studio_services?.length > 0 
        ? ` Offering ${studio.studio_services.map(s => s.service.toLowerCase()).join(', ')}`
        : '';
      const typesContext = studio.studio_studio_types?.length > 0
        ? `. This ${studio.studio_studio_types.map(t => t.studio_type.toLowerCase()).join(' and ')} is ideal for voiceover professionals`
        : '';
      
      const supplementalContent = `Professional voiceover recording studio${locationContext}.${servicesContext}${typesContext}. Equipped for high-quality audio production and voice recording sessions. Contact us to discuss your project requirements and book a session.`;
      
      businessDescription = businessDescription 
        ? `${businessDescription} ${supplementalContent}`
        : supplementalContent;
    }
    
    // Fallback if still empty
    if (!businessDescription.trim()) {
      businessDescription = 'Voiceover recording studio available for hire in the UK.';
    }

    // Parse address for structured data
    const fullAddress = studio.full_address || '';
    const addressParts = fullAddress.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    // Extract city and postal code if available
    const cityName = studio.city || (addressParts.length > 1 ? addressParts[addressParts.length - 2] : '');
    const lastPart = addressParts.length > 0 ? addressParts[addressParts.length - 1] : '';
    const postalCode = lastPart && typeof lastPart === 'string' ? (lastPart.match(/[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/)?.[0] || '') : '';
    
    // Get phone number from studio profile
    const phoneNumber = studio.phone || undefined;
    
    // Build sameAs array with available social media and website URLs
    const sameAsLinks = [
      studio.website_url,
      studio.facebook_url,
      studio.x_url || studio.twitter_url,
      studio.linkedin_url,
      studio.instagram_url,
      studio.youtube_url,
      studio.vimeo_url,
      studio.soundcloud_url,
    ].filter((url): url is string => !!url && url.trim().length > 0);
    
    // Generate structured data for SEO (LocalBusiness schema)
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      additionalType: 'https://schema.org/RecordingStudio',
      '@id': pageUrl,
      name: studio.name,
      description: businessDescription,
      url: pageUrl,
      telephone: phoneNumber,
      address: studio.full_address ? {
        '@type': 'PostalAddress',
        streetAddress: addressParts[0] || studio.full_address || '',
        addressLocality: cityName,
        addressRegion: 'England',
        postalCode: postalCode,
        addressCountry: 'GB',
      } : undefined,
      geo: studio.latitude && studio.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: Number(studio.latitude),
        longitude: Number(studio.longitude),
      } : undefined,
      hasMap: studio.latitude && studio.longitude ? `https://www.google.com/maps?q=${Number(studio.latitude)},${Number(studio.longitude)}` : undefined,
      areaServed: {
        '@type': 'AdministrativeArea',
        name: 'United Kingdom',
      },
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
      // Use ImageObject for primary image
      image: studio.studio_images[0] ? {
        '@type': 'ImageObject',
        url: studio.studio_images[0].image_url,
        caption: studio.studio_images[0].alt_text || `${studio.name} recording studio`,
      } : undefined,
      priceRange: '££',
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
        description: 'By appointment - contact studio for availability',
      },
      sameAs: sameAsLinks.length > 0 ? sameAsLinks : undefined,
      knowsAbout: ['Voiceover Recording', 'Audio Production', 'Sound Engineering', 'Voice Recording'],
      slogan: studio.short_about || undefined,
    };
    
    // BreadcrumbList schema for navigation
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Studios',
          item: `${baseUrl}/studios`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: studio.name,
          item: pageUrl,
        },
      ],
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

    // Clean breadcrumb schema (no undefined values)
    const cleanedBreadcrumbSchema = JSON.parse(
      JSON.stringify(breadcrumbSchema, (_key, value) => value === undefined ? null : value)
    );
    Object.keys(cleanedBreadcrumbSchema).forEach(key => 
      cleanedBreadcrumbSchema[key] === null && delete cleanedBreadcrumbSchema[key]
    );

    return (
      <>
        {/* LocalBusiness structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanedStructuredData) }}
        />
        {/* BreadcrumbList structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanedBreadcrumbSchema) }}
        />
        <ModernStudioProfileV3 
          studio={({
            ...((): Omit<typeof studio, 'website_url' | 'phone' | 'latitude' | 'longitude' | 'studio_images' | 'reviews' | 'users' | 'studio_studio_types'> => {
              const { website_url: _, phone: __, latitude: ___, longitude: ____, studio_images: _____, reviews: ______, users: _______, studio_studio_types: ________, ...rest } = studio;
              return rest as any;
            })(),
            description: studio.description || '',
            full_address: studio.full_address || '',
            abbreviated_address: studio.abbreviated_address || '',
            studio_studio_types: studio.studio_studio_types && studio.studio_studio_types.length > 0 
              ? studio.studio_studio_types.map(st => st.studio_type) 
              : [],
            owner: {
              ...studio.users,
              avatar_url: studio.users.avatar_url || '',
              profile: {
                studio_name: studio.name,
                last_name: studio.last_name,
                phone: studio.phone,
                about: studio.about,
                short_about: studio.short_about,
                location: studio.location,
                rate_tier_1: studio.rate_tier_1,
                rate_tier_2: studio.rate_tier_2,
                rate_tier_3: studio.rate_tier_3,
                show_rates: studio.show_rates,
                facebook_url: studio.facebook_url,
                twitter_url: studio.twitter_url,
                linkedin_url: studio.linkedin_url,
                instagram_url: studio.instagram_url,
                youtube_url: studio.youtube_url,
                vimeo_url: studio.vimeo_url,
                soundcloud_url: studio.soundcloud_url,
                is_crb_checked: studio.is_crb_checked,
                is_featured: studio.is_featured,
                is_spotlight: studio.is_spotlight,
                verification_level: studio.verification_level,
                home_studio_description: studio.home_studio_description,
                equipment_list: studio.equipment_list,
                services_offered: studio.services_offered,
                show_email: studio.show_email,
                show_phone: studio.show_phone,
                show_address: studio.show_address,
                show_directions: studio.show_directions,
                use_coordinates_for_map: studio.use_coordinates_for_map,
                // Connection types
                connection1: studio.connection1,
                connection2: studio.connection2,
                connection3: studio.connection3,
                connection4: studio.connection4,
                connection5: studio.connection5,
                connection6: studio.connection6,
                connection7: studio.connection7,
                connection8: studio.connection8,
                connection9: studio.connection9,
                connection10: studio.connection10,
                connection11: studio.connection11,
                connection12: studio.connection12,
                custom_connection_methods: studio.custom_connection_methods,
              },
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

import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://voiceoverstudiofinder.com';

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/studios`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Dynamic studio routes - with error handling for build-time database unavailability
  let studioRoutes: MetadataRoute.Sitemap = [];
  
  try {
    const studios = await db.studio_profiles.findMany({
      where: { 
        status: 'ACTIVE',
        is_profile_visible: true,
      },
      select: {
        updated_at: true,
        users: {
          select: {
            username: true,
          },
        },
      },
    });

    studioRoutes = studios.map((studio) => ({
      url: `${baseUrl}/${studio.users.username}`,
      lastModified: studio.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.warn('Could not fetch studio profiles for sitemap during build, will be generated at runtime:', error);
    // Return only static routes - dynamic routes will be crawled by search engines
  }

  return [...staticRoutes, ...studioRoutes];
}

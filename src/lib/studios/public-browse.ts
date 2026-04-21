import { db } from '@/lib/db';
import {
  StudioSearchMapMarker,
  StudioSearchResponse,
  StudioSearchStudio,
} from '@/components/search/studios-page-types';

const MAX_STUDIOS_TO_FETCH = 500;
export const DEFAULT_STUDIOS_PAGE_SIZE = 30;

interface BrowseStudiosPageOptions {
  page: number;
  limit?: number;
}

interface PrioritizableStudio extends Omit<StudioSearchStudio, 'owner'> {
  users?: {
    id: string;
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
}

function mulberry32(seed: number): () => number {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(array: T[], seed?: number): T[] {
  const shuffled = [...array];
  const random = seed !== undefined ? mulberry32(seed) : Math.random;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentItem = shuffled[index];
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = currentItem!;
  }

  return shuffled;
}

function prioritizeStudios(studios: PrioritizableStudio[], offset: number, limit: number, seed: number) {
  const pinnedStudio = studios.find(studio => studio.users?.username === 'VoiceoverGuy');
  const remainingStudios = studios.filter(studio => studio.users?.username !== 'VoiceoverGuy');

  const verifiedWithImages = remainingStudios.filter(
    studio => studio.is_verified && studio.studio_images.length > 0,
  );
  const unverifiedWithImages = remainingStudios.filter(
    studio => !studio.is_verified && studio.studio_images.length > 0,
  );
  const studiosWithoutImages = remainingStudios.filter(
    studio => studio.studio_images.length === 0,
  );

  const prioritizedStudios = [
    ...(pinnedStudio ? [pinnedStudio] : []),
    ...shuffleArray(verifiedWithImages, seed),
    ...shuffleArray(unverifiedWithImages, seed + 1),
    ...shuffleArray(studiosWithoutImages, seed + 2),
  ];

  return {
    studios: prioritizedStudios.slice(offset, offset + limit),
    hasMore: prioritizedStudios.length > offset + limit,
    totalCount: prioritizedStudios.length,
  };
}

export function getDailyStudioShuffleSeed(date = new Date()): number {
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

export async function getPublicStudiosBrowsePage({
  page,
  limit = DEFAULT_STUDIOS_PAGE_SIZE,
}: BrowseStudiosPageOptions): Promise<{ response: StudioSearchResponse; seed: number }> {
  const currentPage = Math.max(1, page);
  const offset = (currentPage - 1) * limit;
  const seed = getDailyStudioShuffleSeed();

  const fetchedStudios = await db.studio_profiles.findMany({
    where: {
      status: 'ACTIVE',
      is_profile_visible: true,
      latitude: { not: null },
      longitude: { not: null },
      city: { not: '' },
    },
    take: MAX_STUDIOS_TO_FETCH,
    select: {
      id: true,
      name: true,
      short_about: true,
      city: true,
      is_premium: true,
      is_verified: true,
      phone: true,
      website_url: true,
      users: {
        select: {
          id: true,
          display_name: true,
          username: true,
          avatar_url: true,
        },
      },
      studio_studio_types: {
        select: {
          studio_type: true,
        },
      },
      studio_services: {
        select: {
          service: true,
        },
      },
      studio_images: {
        orderBy: { sort_order: 'asc' },
        select: {
          image_url: true,
          alt_text: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  const serializedStudios: PrioritizableStudio[] = fetchedStudios.map(studio => ({
    id: studio.id,
    name: studio.name,
    description: studio.short_about || '',
    address: studio.city || '',
    is_premium: studio.is_premium,
    is_verified: studio.is_verified,
    studio_studio_types: studio.studio_studio_types,
    studio_services: studio.studio_services,
    studio_images: studio.studio_images,
    _count: studio._count,
    ...(studio.city ? { city: studio.city } : {}),
    ...(studio.website_url ? { website_url: studio.website_url } : {}),
    ...(studio.phone ? { phone: studio.phone } : {}),
    ...(studio.users ? { users: studio.users } : {}),
  }));

  const prioritized = prioritizeStudios(serializedStudios, offset, limit, seed);
  const totalPages = Math.max(1, Math.ceil(prioritized.totalCount / limit));

  const paginatedStudios: StudioSearchStudio[] = prioritized.studios.map(studio => ({
    id: studio.id,
    name: studio.name,
    description: studio.description,
    address: studio.address,
    is_premium: studio.is_premium,
    is_verified: studio.is_verified,
    studio_studio_types: studio.studio_studio_types,
    studio_services: studio.studio_services,
    studio_images: studio.studio_images,
    _count: studio._count,
    ...(studio.city ? { city: studio.city } : {}),
    ...(studio.website_url ? { website_url: studio.website_url } : {}),
    ...(studio.phone ? { phone: studio.phone } : {}),
    ...(studio.users
      ? {
          owner: {
            id: studio.users.id,
            ...(studio.users.display_name ? { display_name: studio.users.display_name } : {}),
            username: studio.users.username,
            ...(studio.users.avatar_url ? { avatar_url: studio.users.avatar_url } : {}),
          },
        }
      : {}),
  }));

  const mapMarkersRaw = await db.studio_profiles.findMany({
    where: {
      status: 'ACTIVE',
      is_profile_visible: true,
      latitude: { not: null },
      longitude: { not: null },
    },
    take: MAX_STUDIOS_TO_FETCH,
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      show_exact_location: true,
      studio_studio_types: {
        select: {
          studio_type: true,
        },
      },
      is_verified: true,
      users: {
        select: {
          username: true,
          avatar_url: true,
        },
      },
      studio_images: {
        select: {
          image_url: true,
          alt_text: true,
        },
        orderBy: {
          sort_order: 'asc',
        },
        take: 1,
      },
    },
  });

  const mapMarkers: StudioSearchMapMarker[] = mapMarkersRaw.map(studio => ({
    id: studio.id,
    name: studio.name,
    latitude: studio.latitude !== null ? Number(studio.latitude) : null,
    longitude: studio.longitude !== null ? Number(studio.longitude) : null,
    show_exact_location: studio.show_exact_location ?? true,
    studio_studio_types: studio.studio_studio_types,
    is_verified: studio.is_verified,
    ...(studio.users
      ? {
          users: {
            ...(studio.users.username ? { username: studio.users.username } : {}),
            ...(studio.users.avatar_url ? { avatar_url: studio.users.avatar_url } : {}),
          },
        }
      : {}),
    ...(studio.studio_images.length > 0 ? { studio_images: studio.studio_images } : {}),
  }));

  return {
    seed,
    response: {
      studios: paginatedStudios,
      mapMarkers,
      pagination: {
        page: currentPage,
        limit,
        offset,
        totalCount: prioritized.totalCount,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        hasMore: prioritized.hasMore,
      },
      filters: {},
      searchCoordinates: null,
      searchRadius: null,
    },
  };
}

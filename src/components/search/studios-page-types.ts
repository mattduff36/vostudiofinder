export interface StudioSearchStudioType {
  studio_type: string;
}

export interface StudioSearchService {
  service: string;
}

export interface StudioSearchImage {
  image_url: string;
  alt_text?: string | null;
}

export interface StudioSearchOwner {
  id: string;
  display_name?: string | null;
  username: string;
  avatar_url?: string | null;
}

export interface StudioSearchStudio {
  id: string;
  name: string;
  description: string;
  studio_studio_types: StudioSearchStudioType[];
  address: string;
  city?: string;
  website_url?: string | null;
  phone?: string | null;
  is_premium: boolean;
  is_verified: boolean;
  latitude?: number | null;
  longitude?: number | null;
  owner?: StudioSearchOwner;
  studio_services: StudioSearchService[];
  studio_images: StudioSearchImage[];
  _count: {
    reviews: number;
  };
}

export interface StudioSearchMapMarker {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  show_exact_location: boolean;
  studio_studio_types: StudioSearchStudioType[];
  is_verified: boolean;
  users?: {
    username?: string | null;
    avatar_url?: string | null;
  };
  studio_images?: StudioSearchImage[];
}

export interface StudioSearchPagination {
  page: number;
  limit: number;
  offset: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  hasMore?: boolean;
}

export interface StudioSearchFilters {
  query?: string;
  location?: string;
  studioTypes?: string[];
  services?: string[];
  studio_studio_types?: string[];
  studio_services?: string[];
}

export interface StudioSearchResponse {
  studios: StudioSearchStudio[];
  mapMarkers?: StudioSearchMapMarker[];
  pagination: StudioSearchPagination;
  filters: StudioSearchFilters;
  searchCoordinates?: { lat: number; lng: number } | null;
  searchRadius?: number | null;
}

/**
 * Prisma types that can be safely imported in client components
 * These are pure TypeScript types with no runtime dependencies
 */

export enum Role {
  USER = 'USER',
  STUDIO_OWNER = 'STUDIO_OWNER',
  ADMIN = 'ADMIN'
}

export enum StudioStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING'
}

export enum MembershipTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE'
}

export enum studio_type {
  HOME = 'HOME',
  RECORDING = 'RECORDING',
  PODCAST = 'PODCAST',
  EDITING = 'EDITING',
  VO_COACH = 'VO_COACH',
  VOICEOVER = 'VOICEOVER'
}

export enum ServiceType {
  ISDN = 'ISDN',
  SOURCE_CONNECT = 'SOURCE_CONNECT',
  SOURCE_CONNECT_NOW = 'SOURCE_CONNECT_NOW',
  CLEANFEED = 'CLEANFEED',
  SESSION_LINK_PRO = 'SESSION_LINK_PRO',
  ZOOM = 'ZOOM',
  SKYPE = 'SKYPE',
  TEAMS = 'TEAMS'
}

// Type-only exports for complex Prisma types
// These match the generated Prisma types but without the runtime dependency
export type User = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: Role;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
};

export type Studio = {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website_url?: string | null;
  phone?: string | null;
  is_premium: boolean;
  is_verified: boolean;
  status: StudioStatus;
  created_at: Date;
  updated_at: Date;
  // Relations (optional for when they're included)
  studio_images?: StudioImage[];
  studio_services?: StudioService[];
  studio_studio_types?: Array<{ studio_type: string }>;
};

export type UserProfile = {
  id: string;
  user_id: string;
  studioName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  about?: string | null;
  short_about?: string | null;
  location?: string | null;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showRates?: boolean;
  show_rates?: boolean;
  rateTier1?: string | null;
  rate_tier_1?: string | null;
  rateTier2?: string | null;
  rate_tier_2?: string | null;
  rateTier3?: string | null;
  rate_tier_3?: string | null;
  is_featured?: boolean;
  is_spotlight?: boolean;
  isCrbChecked?: boolean;
  verificationLevel?: string | null;
  verification_level?: string | null;
  homeStudioDescription?: string | null;
  home_studio_description?: string | null;
  equipmentList?: string | null;
  equipment_list?: string | null;
  servicesOffered?: string | null;
  services_offered?: string | null;
  facebookUrl?: string | null;
  facebook_url?: string | null;
  twitterUrl?: string | null;
  twitter_url?: string | null;
  linkedinUrl?: string | null;
  linkedin_url?: string | null;
  instagramUrl?: string | null;
  instagram_url?: string | null;
  youtubeUrl?: string | null;
  youtube_url?: string | null;
  vimeoUrl?: string | null;
  vimeo_url?: string | null;
  soundcloudUrl?: string | null;
  soundcloud_url?: string | null;
  created_at: Date;
  updated_at: Date;
};

export type StudioImage = {
  id: string;
  studio_id: string;
  imageUrl?: string;
  image_url?: string;
  caption?: string | null;
  alt_text?: string | null;
  altText?: string | null;
  order?: number;
  sort_order?: number;
  sortOrder?: number;
  created_at: Date;
};

export type StudioService = {
  id: string;
  studio_id: string;
  service?: string;
  serviceType?: ServiceType;
  service_type?: string;
  description?: string | null;
  price?: number | null;
  created_at: Date;
};

export type UserMetadata = {
  id: string;
  user_id: string;
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
};

export type UserConnection = {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};



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
  created_at: Date;
  updated_at: Date;
};

export type StudioImage = {
  id: string;
  studio_id: string;
  imageUrl: string;
  caption?: string | null;
  order: number;
  created_at: Date;
};

export type StudioService = {
  id: string;
  studio_id: string;
  serviceType: ServiceType;
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



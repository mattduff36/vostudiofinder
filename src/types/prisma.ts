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

export enum StudioType {
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
  displayName: string;
  avatarUrl?: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Studio = {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  websiteUrl?: string | null;
  phone?: string | null;
  isPremium: boolean;
  isVerified: boolean;
  status: StudioStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfile = {
  id: string;
  userId: string;
  studioName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  about?: string | null;
  shortAbout?: string | null;
  location?: string | null;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  createdAt: Date;
  updatedAt: Date;
};


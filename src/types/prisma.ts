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


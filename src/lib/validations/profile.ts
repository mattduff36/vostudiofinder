import { z } from 'zod';
import { stripHtmlTags } from '@/lib/utils/sanitize';

/**
 * Username validation schema
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * URL validation schema (optional field)
 */
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .regex(/^https?:\/\//, 'URL must start with http:// or https://')
  .optional()
  .or(z.literal(''));

/**
 * Phone number validation schema (optional)
 */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-+()]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters')
  .optional()
  .or(z.literal(''));

/**
 * Rate validation schema (positive number, max 9999.99)
 */
export const rateSchema = z
  .number()
  .positive('Rate must be a positive number')
  .max(9999.99, 'Rate cannot exceed £9,999.99')
  .optional()
  .nullable();

/**
 * Studio types enum
 */
export const StudioTypeEnum = z.enum([
  'HOME',
  'RECORDING',
  'AUDIO_PRODUCER',
  'VO_COACH',
  'PODCAST',
  'VOICEOVER',
]);

/**
 * Services enum (add more as needed)
 */
export const ServiceTypeEnum = z.enum([
  'RECORDING',
  'EDITING',
  'MIXING',
  'MASTERING',
  'VOICE_DIRECTION',
  'AUDIO_RESTORATION',
  'PODCAST_PRODUCTION',
  'DUBBING',
  'ADR',
  'FOLEY',
]);

/**
 * Connection method (stored as '0' or '1')
 */
export const connectionSchema = z.enum(['0', '1']).optional();

/**
 * User update schema
 */
export const userUpdateSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters')
    .optional(),
  username: usernameSchema.optional(),
});

/**
 * User profile update schema
 */
export const userProfileUpdateSchema = z.object({
  // Contact information
  phone: phoneSchema,
  location: z.string().max(255).optional(),
  
  // About sections (with HTML sanitization)
  about: z.string().max(1500, 'About section must be less than 1500 characters').transform(stripHtmlTags).optional(),
  short_about: z.string().max(140, 'Short about must be less than 140 characters').transform(stripHtmlTags).optional(),
  
  // Rates
  rate_tier_1: rateSchema,
  rate_tier_2: rateSchema,
  rate_tier_3: rateSchema,
  show_rates: z.boolean().optional(),
  
  // Social media
  facebook_url: urlSchema,
  twitter_url: urlSchema,
  linkedin_url: urlSchema,
  instagram_url: urlSchema,
  youtube_url: urlSchema,
  vimeo_url: urlSchema,
  soundcloud_url: urlSchema,
  
  // Connection methods
  connection1: connectionSchema, // Source Connect
  connection2: connectionSchema, // Source Connect Now
  connection3: connectionSchema, // ipDTL
  connection4: connectionSchema, // Session Link Pro
  connection5: connectionSchema, // Clean Feed
  connection6: connectionSchema, // Zoom
  connection7: connectionSchema, // Teams
  connection8: connectionSchema, // Skype
  
  // Custom connection methods
  custom_connection_1_name: z.string().max(50).optional(),
  custom_connection_1_value: z.string().max(100).optional(),
  custom_connection_2_name: z.string().max(50).optional(),
  custom_connection_2_value: z.string().max(100).optional(),
  
  // Visibility settings
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
  show_address: z.boolean().optional(),
  
  // Other fields
  studio_name: z
    .string()
    .min(2, 'Studio name must be at least 2 characters')
    .max(35, 'Studio name must be less than 35 characters')
    .optional(),
  equipment_list: z.string().max(1000).transform(stripHtmlTags).optional(),
  services_offered: z.string().max(1000).transform(stripHtmlTags).optional(),
  home_studio_description: z.string().max(1000).optional(),
});

/**
 * Studio update schema
 */
export const studioUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Studio name must be at least 2 characters')
    .max(100, 'Studio name must be less than 100 characters')
    .optional(),
  description: z.string().max(2000).optional(),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(255, 'Address must be less than 255 characters')
    .optional(),
  website_url: urlSchema,
  phone: phoneSchema,
});

/**
 * Complete profile update schema
 */
export const profileUpdateSchema = z.object({
  user: userUpdateSchema.optional(),
  profile: userProfileUpdateSchema.optional(),
  studio: studioUpdateSchema.optional(),
  studio_types: z.array(StudioTypeEnum).optional(),
  services: z.array(ServiceTypeEnum).optional(),
});

/**
 * Image upload validation schema
 */
export const imageUploadSchema = z.object({
  alt_text: z.string().max(255, 'Alt text must be less than 255 characters').optional(),
});

/**
 * Image reorder schema
 */
export const imageReorderSchema = z.object({
  images: z.array(
    z.object({
      id: z.string(),
      sort_order: z.number().int().min(0),
    })
  ),
});


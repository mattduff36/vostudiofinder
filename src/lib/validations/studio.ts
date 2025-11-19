import { z } from 'zod';
import { StudioType, ServiceType } from '@prisma/client';

export const createStudioSchema = z.object({
  name: z
    .string()
    .min(2, 'Studio name must be at least 2 characters long')
    .max(100, 'Studio name must be less than 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(2000, 'Description must be less than 2000 characters'),
  studio_studio_types: z
    .array(z.nativeEnum(StudioType))
    .min(1, 'Please select at least one studio type'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters long')
    .max(255, 'Address must be less than 255 characters')
    .optional(), // Legacy field
  full_address: z
    .string()
    .max(500, 'Full address must be less than 500 characters')
    .optional(),
  abbreviated_address: z
    .string()
    .max(255, 'Abbreviated address must be less than 255 characters')
    .optional(),
  website_url: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  studio_services: z
    .array(z.nativeEnum(ServiceType))
    .min(1, 'Please select at least one service'),
  studio_images: z
    .array(z.object({
      url: z.string().url('Please enter a valid image URL'),
      alt_text: z.string().optional(),
    }))
    .max(10, 'Maximum 10 images allowed')
    .optional(),
});

export const updateStudioSchema = z.object({
  id: z.string().cuid('Invalid studio ID'),
  name: z
    .string()
    .min(2, 'Studio name must be at least 2 characters long')
    .max(100, 'Studio name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  studio_studio_types: z
    .array(z.nativeEnum(StudioType))
    .min(1, 'Please select at least one studio type')
    .optional(),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters long')
    .max(255, 'Address must be less than 255 characters')
    .optional(), // Legacy field
  full_address: z
    .string()
    .max(500, 'Full address must be less than 500 characters')
    .optional(),
  abbreviated_address: z
    .string()
    .max(255, 'Abbreviated address must be less than 255 characters')
    .optional(),
  website_url: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  studio_services: z
    .array(z.nativeEnum(ServiceType))
    .min(1, 'Please select at least one service')
    .optional(),
  studio_images: z
    .array(z.object({
      url: z.string().url('Please enter a valid image URL'),
      alt_text: z.string().optional(),
    }))
    .max(10, 'Maximum 10 images allowed')
    .optional(),
});

export const studioSearchSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  radius: z.number().min(1).max(500).optional(),
  lat: z.number().min(-90).max(90).optional(), // Latitude coordinate
  lng: z.number().min(-180).max(180).optional(), // Longitude coordinate
  studio_studio_types: z.array(z.string()).optional(), // Changed to string array to handle multiple types and NLP-detected types
  studio_services: z.array(z.string()).optional(), // Changed to string array for flexibility
  equipment: z.array(z.string()).optional(), // New equipment parameter
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(18), // Default to 18 for initial load
  offset: z.number().min(0).default(0), // New offset parameter for load-more pattern
  sortBy: z.enum(['name', 'distance', 'rating', 'created_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateStudioInput = z.infer<typeof createStudioSchema>;
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>;
export type StudioSearchInput = z.infer<typeof studioSearchSchema>;

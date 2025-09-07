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
  studioType: z.nativeEnum(StudioType),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters long')
    .max(255, 'Address must be less than 255 characters'),
  websiteUrl: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  services: z
    .array(z.nativeEnum(ServiceType))
    .min(1, 'Please select at least one service'),
  images: z
    .array(z.object({
      url: z.string().url('Please enter a valid image URL'),
      altText: z.string().optional(),
    }))
    .max(10, 'Maximum 10 images allowed')
    .optional(),
});

export const updateStudioSchema = createStudioSchema.partial();

export const studioSearchSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  radius: z.number().min(1).max(500).optional(),
  studioType: z.string().optional(), // Changed to string to handle NLP-detected types
  services: z.array(z.string()).optional(), // Changed to string array for flexibility
  equipment: z.array(z.string()).optional(), // New equipment parameter
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  sortBy: z.enum(['name', 'distance', 'rating', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateStudioInput = z.infer<typeof createStudioSchema>;
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>;
export type StudioSearchInput = z.infer<typeof studioSearchSchema>;

import { prisma } from '@/lib/db';

/**
 * Validates featured studio transition and enforces 6-studio limit
 */
export async function validateFeaturedTransition(
  studioId: string,
  isFeatured: boolean,
  currentlyFeatured: boolean,
  featuredExpiresAt?: string
): Promise<{ valid: true } | { valid: false; error: string; status: number }> {
  
  // If trying to feature this studio and it's not currently featured
  if (isFeatured && !currentlyFeatured) {
    // Require expiry date when featuring
    if (!featuredExpiresAt) {
      return {
        valid: false,
        error: 'Featured expiry date is required when featuring a studio',
        status: 400,
      };
    }
    
    // Validate expiry date is in the future
    const expiryDate = new Date(featuredExpiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return {
        valid: false,
        error: 'Featured expiry date must be a valid future date',
        status: 400,
      };
    }
    
    // Check featured count limit (max 6)
    const now = new Date();
    const featuredCount = await prisma.studio_profiles.count({
      where: { 
        is_featured: true,
        id: { not: studioId }, // Exclude current studio from count
        OR: [
          { featured_until: null },
          { featured_until: { gte: now } }
        ]
      }
    });
    
    if (featuredCount >= 6) {
      return {
        valid: false,
        error: 'Maximum of 6 featured studios reached. Please unfeature another studio first.',
        status: 400,
      };
    }
  }
  
  return { valid: true };
}

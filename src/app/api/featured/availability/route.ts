import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';

/**
 * GET /api/featured/availability
 * Returns the current featured studio availability
 * - maxFeatured: 6 (system-wide limit)
 * - featuredCount: number of currently featured studios (not expired)
 * - remaining: slots available
 * - nextAvailableAt: earliest featured_until date (if all slots taken)
 */
export async function GET() {
  try {
    const now = new Date();
    
    // Count studios that are currently featured and not expired
    // A studio is considered featured if:
    // - is_featured = true
    // - AND (featured_until IS NULL OR featured_until >= now)
    const featuredCount = await db.studio_profiles.count({
      where: {
        is_featured: true,
        OR: [
          { featured_until: null },
          { featured_until: { gte: now } }
        ]
      }
    });
    
    const maxFeatured = 6;
    const remaining = Math.max(0, maxFeatured - featuredCount);
    
    // If all slots are taken, find the earliest expiry date
    // Note: Studios with featured_until = null have perpetual featured status
    // so we only look for studios with actual expiry dates
    let nextAvailableAt: string | null = null;
    if (remaining === 0) {
      const earliestExpiry = await db.studio_profiles.findFirst({
        where: {
          is_featured: true,
          featured_until: { 
            not: null,
            gte: now 
          }
        },
        orderBy: { featured_until: 'asc' },
        select: { featured_until: true }
      });
      
      if (earliestExpiry?.featured_until) {
        nextAvailableAt = earliestExpiry.featured_until.toISOString();
      }
    }
    
    return NextResponse.json({
      maxFeatured,
      featuredCount,
      remaining,
      nextAvailableAt,
    });
  } catch (error) {
    console.error('Featured availability error:', error);
    handleApiError(error, 'Featured availability check failed');
    
    return NextResponse.json(
      { error: 'Failed to check featured availability' },
      { status: 500 }
    );
  }
}

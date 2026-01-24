import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/error-logging';

/**
 * GET /api/featured/availability
 * Returns the current featured studio availability
 * - maxFeatured: 6 (system-wide limit)
 * - featuredCount: number of currently featured studios (not expired)
 * - remaining: slots available
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
    
    return NextResponse.json({
      maxFeatured,
      featuredCount,
      remaining,
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

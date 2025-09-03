import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchTerm = query.toLowerCase();

    // Search for studios
    const studios = await db.studio.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
      },
      take: 5,
    });

    // Search for locations
    const locations = await db.studio.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          { address: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        address: true,
      },
      distinct: ['address'],
      take: 5,
    });

    // Search for services
    const services = await db.studioService.findMany({
      where: {
        service: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        service: true,
      },
      distinct: ['service'],
      take: 5,
    });

    const suggestions = [
      // Studio suggestions
      ...studios.map((studio) => ({
        id: `studio-${studio.id}`,
        text: studio.name,
        type: 'studio' as const,
      })),
      // Location suggestions
      ...locations.map((location, index) => ({
        id: `location-${index}`,
        text: location.address,
        type: 'location' as const,
      })),
      // Service suggestions
      ...services.map((service, index) => ({
        id: `service-${index}`,
        text: service.service,
        type: 'service' as const,
      })),
    ];

    // Sort by relevance (exact matches first, then partial matches)
    suggestions.sort((a, b) => {
      const aExact = a.text.toLowerCase().startsWith(searchTerm);
      const bExact = b.text.toLowerCase().startsWith(searchTerm);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return a.text.localeCompare(b.text);
    });

    return NextResponse.json({
      suggestions: suggestions.slice(0, 10), // Limit to 10 suggestions
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

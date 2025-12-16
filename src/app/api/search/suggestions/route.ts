import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateDistance } from '@/lib/utils/address';

// Enhanced search type detection
function detectSearchType(input: string): string {
  const lowerInput = input.toLowerCase().trim();
  
  // Location patterns
  const locationPatterns = [
    /^[a-z\s]+,\s*[a-z\s]+$/i, // City, Country/State
    /^[a-z\s]+\s+\d{5}$/i, // City ZIP
    /^\d{5}$/i, // ZIP code only
    /^[a-z]{1,2}\d{1,2}\s*\d[a-z]{2}$/i, // UK postcode
    /\b(london|manchester|birmingham|glasgow|edinburgh|cardiff|belfast|dublin|new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|jacksonville|fort worth|columbus|charlotte|san francisco|indianapolis|seattle|denver|washington|boston|el paso|detroit|nashville|portland|oklahoma city|las vegas|louisville|baltimore|milwaukee|albuquerque|tucson|fresno|sacramento|mesa|kansas city|atlanta|long beach|colorado springs|raleigh|miami|virginia beach|omaha|oakland|minneapolis|tulsa|arlington|new orleans|wichita|cleveland|tampa|bakersfield|aurora|honolulu|anaheim|santa ana|corpus christi|riverside|lexington|stockton|toledo|st. paul|newark|greensboro|plano|henderson|lincoln|buffalo|jersey city|chula vista|fort wayne|orlando|st. petersburg|chandler|laredo|norfolk|durham|madison|lubbock|irvine|winston-salem|glendale|garland|hialeah|reno|chesapeake|gilbert|baton rouge|irving|scottsdale|north las vegas|fremont|boise|richmond|san bernardino|birmingham|spokane|rochester|des moines|modesto|fayetteville|tacoma|oxnard|fontana|columbus|montgomery|moreno valley|shreveport|aurora|yonkers|akron|huntington beach|little rock|augusta|amarillo|glendale|mobile|grand rapids|salt lake city|tallahassee|huntsville|grand prairie|knoxville|worcester|newport news|brownsville|overland park|santa clarita|providence|garden grove|chattanooga|oceanside|jackson|fort lauderdale|santa rosa|rancho cucamonga|port st. lucie|tempe|ontario|vancouver|peoria|pembroke pines|salem|cape coral|sioux falls|springfield|peoria|lancaster|elk grove|corona|palmdale|salinas|eugene|pasadena|hayward|pomona|cary|rockford|alexandria|escondido|mckinney|kansas city|joliet|sunnyvale|torrance|bridgeport|lakewood|hollywood|paterson|naperville|syracuse|mesquite|dayton|savannah|clarksville|orange|pasadena|fullerton|killeen|frisco|hampton|mcallen|warren|west valley city|columbia|olathe|sterling heights|new haven|miramar|waco|thousand oaks|cedar rapids|charleston|sioux city|round rock|fargo|carrollton|roseville|concord|thornton|visalia|beaumont|gainesville|simi valley|coral springs|stamford|westminster)\b/i
  ];
  
  // Studio name patterns
  const studioPatterns = [
    /\b(studio|studios|recording|audio|sound|voice|vocal|booth|production|media|creative)\b/i,
    /^[a-z0-9]+\s*(studio|recording|audio|sound|voice|vocal|booth|production|media|creative)/i,
    /^(a1|a-1|studio\s*\d+|room\s*\d+)/i
  ];
  
  // Service/Equipment patterns
  const servicePatterns = [
    /\b(isdn|source\s*connect|cleanfeed|session\s*link|zoom|skype|teams|pro\s*tools|logic|cubase|reaper|audacity|neumann|shure|akg|rode|focusrite|universal\s*audio|apollo|scarlett|ssl|neve|api|avalon|tube-tech|la-2a|1176|dbx|lexicon|tc\s*electronic|eventide|waves|plugin|vst|aax|rtas|tdm|midi|xlr|trs|usb|thunderbolt|firewire|adat|spdif|aes|ebu|wordclock|phantom\s*power|preamp|compressor|eq|equalizer|reverb|delay|chorus|flanger|phaser|distortion|overdrive|fuzz|gate|limiter|expander|de-esser|vocal\s*strip|channel\s*strip|console|mixer|interface|converter|monitor|speaker|headphone|microphone|mic|condenser|dynamic|ribbon|pop\s*filter|shock\s*mount|boom|stand|cable|patch\s*bay|di\s*box|direct\s*box|splitter|switcher|router|patchbay|talkback|cue\s*mix|fold\s*back|monitor\s*mix|headphone\s*mix|control\s*room|live\s*room|isolation\s*booth|vocal\s*booth|drum\s*room|piano\s*room|amp\s*room|machine\s*room|server\s*room|patch\s*room|storage|lounge|kitchen|bathroom|parking|wifi|internet|ethernet|fiber|broadband|dsl|cable|satellite|cellular|4g|5g|lte)\b/i
  ];

  if (locationPatterns.some(pattern => pattern.test(lowerInput))) {
    return 'location';
  }
  
  if (studioPatterns.some(pattern => pattern.test(lowerInput))) {
    return 'studio';
  }
  
  if (servicePatterns.some(pattern => pattern.test(lowerInput))) {
    return 'service';
  }
  
  // Check if it looks like a username (alphanumeric, possibly with underscores/hyphens)
  if (/^[a-z0-9_-]{3,20}$/i.test(lowerInput) && !lowerInput.includes(' ')) {
    return 'user';
  }
  
  if (/^[a-z0-9]{2,15}$/i.test(lowerInput)) {
    return 'studio';
  }
  
  if (/[a-z]+\d+|[a-z]+[-_]\d+|\d+[a-z]+/i.test(lowerInput)) {
    return 'equipment';
  }
  
  return 'general';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const searchTerm = query.toLowerCase();
    const searchType = detectSearchType(query);

    // Prioritize searches based on detected type
    let suggestions: any[] = [];

    if (searchType === 'user') {
      // For user searches, don't return studio suggestions to avoid duplicates
      // The EnhancedSearchBar will handle user suggestions directly
      suggestions = [];
    } else if (searchType === 'location') {
      // Prioritize location searches
      const locations = await db.studio_profiles.findMany({
        where: {
          AND: [
            { status: 'ACTIVE' },
            { full_address: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          full_address: true,
          latitude: true,
          longitude: true,
        },
        distinct: ['full_address'],
        take: 8,
      });

      suggestions.push(...locations.map((location, index) => ({
        id: `location-${index}`,
        text: location.full_address,
        type: 'location' as const,
        metadata: {
          coordinates: location.latitude && location.longitude ? {
            lat: Number(location.latitude),
            lng: Number(location.longitude)
          } : undefined
        }
      })));
    } else if (searchType === 'studio') {
      // Prioritize studio searches
      const studios = await db.studio_profiles.findMany({
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
          full_address: true,
        },
        take: 8,
      });

      suggestions.push(...studios.map((studio) => ({
        id: `studio-${studio.id}`,
        text: studio.name,
        type: 'studio' as const,
        metadata: {
          studio_id: studio.id,
          full_address: studio.full_address
        }
      })));
    } else if (searchType === 'service' || searchType === 'equipment') {
      // Search for services/equipment
      const allServiceTypes = ['ISDN', 'SOURCE_CONNECT', 'SOURCE_CONNECT_NOW', 'CLEANFEED', 'SESSION_LINK_PRO', 'ZOOM', 'SKYPE', 'TEAMS'];
      const matchingServices = allServiceTypes
        .filter(service => service.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 8)
        .map(service => ({ service }));

      suggestions.push(...matchingServices.map((service, index) => ({
        id: `service-${index}`,
        text: service.service.replace(/_/g, ' '),
        type: searchType === 'equipment' ? 'equipment' as const : 'service' as const,
      })));
    } else {
      // General search - mix all types
      const [studios, locations, services] = await Promise.all([
        db.studio_profiles.findMany({
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
            full_address: true,
          },
          take: 3,
        }),
        db.studio_profiles.findMany({
          where: {
            AND: [
              { status: 'ACTIVE' },
              { full_address: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          select: {
            full_address: true,
            latitude: true,
            longitude: true,
          },
          distinct: ['full_address'],
          take: 3,
        }),
        Promise.resolve(['ISDN', 'SOURCE_CONNECT', 'SOURCE_CONNECT_NOW', 'CLEANFEED', 'SESSION_LINK_PRO', 'ZOOM', 'SKYPE', 'TEAMS']
          .filter(service => service.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice(0, 2)
          .map(service => ({ service })))
      ]);

      suggestions = [
        ...studios.map((studio) => ({
          id: `studio-${studio.id}`,
          text: studio.name,
          type: 'studio' as const,
          metadata: {
            studio_id: studio.id,
            full_address: studio.full_address
          }
        })),
        ...locations.map((location, index) => {
          // Calculate distance if user location is available
          let distance: number | undefined;
          if (userLat && userLng && location.latitude && location.longitude) {
            distance = calculateDistance(
              userLat,
              userLng,
              Number(location.latitude),
              Number(location.longitude)
            );
          }

          return {
            id: `location-${index}`,
            text: location.full_address,
            type: 'location' as const,
            distance,
            metadata: {
              coordinates: location.latitude && location.longitude ? {
                lat: Number(location.latitude),
                lng: Number(location.longitude)
              } : undefined
            }
          };
        }),
        ...services.map((service, index) => ({
          id: `service-${index}`,
          text: service.service.replace(/_/g, ' '),
          type: 'service' as const,
        })),
      ];
    }

    // Sort by relevance, type priority, and distance
    suggestions.sort((a, b) => {
      // Prioritize by detected type
      if (a.type === searchType && b.type !== searchType) return -1;
      if (a.type !== searchType && b.type === searchType) return 1;
      
      // Then by exact matches
      const aText = a.text || '';
      const bText = b.text || '';
      const aExact = aText.toLowerCase().startsWith(searchTerm);
      const bExact = bText.toLowerCase().startsWith(searchTerm);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // For items of the same type, sort by distance if available
      if (a.type === b.type) {
        // If both have distance, sort by distance (closest first)
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        // If only one has distance, prioritize it
        if (a.distance !== undefined && b.distance === undefined) return -1;
        if (a.distance === undefined && b.distance !== undefined) return 1;
      }
      
      // Fallback to alphabetical sorting
      return aText.localeCompare(bText);
    });

    return NextResponse.json({
      suggestions: suggestions.slice(0, 8), // Limit to 8 suggestions
      searchType, // Include detected search type for client
    });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

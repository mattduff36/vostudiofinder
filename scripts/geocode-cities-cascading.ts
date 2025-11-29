import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { extractCity } from '../src/lib/utils/address';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();

// API Keys
const MAPBOX_TOKEN = process.env.MAPBOX_API_KEY || process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// UK City Mappings for Nominatim/Manual parser
const UK_CITY_MAPPINGS: Record<string, string> = {
  'City of London': 'London',
  'City of Westminster': 'London',
  'Greater London': 'London',
  'Greater Manchester': 'Manchester',
  'West Midlands': 'Birmingham',
};

interface MapboxFeature {
  place_type?: string[];
  text?: string;
  context?: Array<{
    id?: string;
    text?: string;
  }>;
}

interface NominatimResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    state_district?: string;
  };
}

// ============================================================================
// METHOD 1: MAPBOX GEOCODING API
// ============================================================================
async function geocodeWithMapbox(address: string): Promise<string | null> {
  if (!MAPBOX_TOKEN) {
    return null;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature: MapboxFeature = data.features[0];

    // If the result is a place (city), return it directly
    if (feature.place_type?.includes('place')) {
      return feature.text || null;
    }

    // Otherwise, look for city in context
    const cityContext = feature.context?.find(c => c.id?.startsWith('place.'));
    return cityContext?.text || null;

  } catch (error) {
    console.error('    Mapbox error:', error);
    return null;
  }
}

// ============================================================================
// METHOD 2: NOMINATIM (OPENSTREETMAP)
// ============================================================================
async function geocodeWithNominatim(address: string): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VoiceoverStudioFinder/1.0 (https://vostudiofinder.com)',
      }
    });

    if (!response.ok) {
      return null;
    }

    const data: NominatimResult[] = await response.json();

    if (!data || data.length === 0 || !data[0].address) {
      return null;
    }

    const addr = data[0].address;
    let city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district;
    
    // Map UK boroughs to parent cities
    if (city && UK_CITY_MAPPINGS[city]) {
      city = UK_CITY_MAPPINGS[city];
    }
    
    if (!city && addr.state && UK_CITY_MAPPINGS[addr.state]) {
      city = UK_CITY_MAPPINGS[addr.state];
    }
    
    return city || null;
  } catch (error) {
    console.error('    Nominatim error:', error);
    return null;
  }
}

// ============================================================================
// METHOD 3: ENHANCED MANUAL PARSER (FALLBACK)
// ============================================================================
function parseWithManualLogic(address: string): string | null {
  const city = extractCity(address);
  return city && city.trim() !== '' ? city : null;
}

// ============================================================================
// CASCADING GEOCODER
// ============================================================================
async function geocodeAddressCascading(address: string): Promise<{ city: string | null; method: string }> {
  // Try Method 1: Mapbox
  if (MAPBOX_TOKEN) {
    const city = await geocodeWithMapbox(address);
    if (city) {
      return { city, method: 'Mapbox' };
    }
  }

  // Try Method 2: Nominatim
  const nominatimCity = await geocodeWithNominatim(address);
  if (nominatimCity) {
    return { city: nominatimCity, method: 'Nominatim' };
  }

  // Try Method 3: Manual Parser
  const manualCity = parseWithManualLogic(address);
  if (manualCity) {
    return { city: manualCity, method: 'Manual Parser' };
  }

  return { city: null, method: 'None' };
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================
async function populateCitiesWithCascading() {
  console.log('🌍 Cascading City Geocoder\n');
  console.log('━'.repeat(80));
  
  if (MAPBOX_TOKEN) {
    console.log('✅ Mapbox API: Enabled (Primary)');
  } else {
    console.log('⚠️  Mapbox API: Not configured (sign up at https://mapbox.com)');
  }
  console.log('✅ Nominatim API: Enabled (Fallback #1)');
  console.log('✅ Manual Parser: Enabled (Fallback #2)');
  console.log('━'.repeat(80) + '\n');

  try {
    const studios = await prisma.studios.findMany({
      where: {
        full_address: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        full_address: true,
        city: true,
      },
    });

    console.log(`📊 Found ${studios.length} studios to process\n`);

    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const methodStats = { Mapbox: 0, Nominatim: 0, 'Manual Parser': 0, None: 0 };

    for (let i = 0; i < studios.length; i++) {
      const studio = studios[i];
      
      if (!studio.full_address) {
        unchanged++;
        continue;
      }

      try {
        console.log(`[${i + 1}/${studios.length}] ${studio.name}`);
        console.log(`  Address: ${studio.full_address}`);
        console.log(`  Current: ${studio.city || '(none)'}`);
        
        const { city, method } = await geocodeAddressCascading(studio.full_address);
        methodStats[method as keyof typeof methodStats]++;

        if (!city) {
          console.log(`  ❌ Failed: Could not extract city\n`);
          failed++;
          continue;
        }

        // Check if city changed
        if (studio.city === city) {
          console.log(`  ✓ Unchanged: "${city}" (${method})\n`);
          unchanged++;
          continue;
        }

        // Update the studio
        await prisma.studios.update({
          where: { id: studio.id },
          data: { city: city.trim() },
        });

        updated++;
        console.log(`  ✅ Updated: "${studio.city || '(none)'}" → "${city}" (${method})\n`);

      } catch (error) {
        failed++;
        console.error(`  ❌ Error:`, error);
        console.log('');
      }

      // Rate limiting: Wait 1 second if using Nominatim
      // (Mapbox doesn't require this, but we'll be nice)
      if (i < studios.length - 1) {
        await new Promise(resolve => setTimeout(resolve, MAPBOX_TOKEN ? 100 : 1000));
      }
    }

    console.log('\n' + '━'.repeat(80));
    console.log('📈 SUMMARY');
    console.log('━'.repeat(80));
    console.log(`   ✅ Updated:    ${updated}`);
    console.log(`   ⏭️  Unchanged:  ${unchanged}`);
    console.log(`   ❌ Failed:     ${failed}`);
    console.log('');
    console.log('📊 METHOD BREAKDOWN:');
    console.log(`   🗺️  Mapbox:          ${methodStats.Mapbox}`);
    console.log(`   🌐 Nominatim:       ${methodStats.Nominatim}`);
    console.log(`   📝 Manual Parser:   ${methodStats['Manual Parser']}`);
    console.log(`   ❌ None:            ${methodStats.None}`);
    console.log('━'.repeat(80));
    console.log('\n✅ Complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

populateCitiesWithCascading();


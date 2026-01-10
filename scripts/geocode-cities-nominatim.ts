import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();

// Nominatim (OpenStreetMap) - Free, no API key required!
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    state_district?: string;
    country?: string;
  };
  display_name?: string;
}

// Known UK cities and their boroughs/districts that should map to the main city
const UK_CITY_MAPPINGS: Record<string, string> = {
  // London boroughs → London
  'City of London': 'London',
  'City of Westminster': 'London',
  'Kensington and Chelsea': 'London',
  'Hammersmith and Fulham': 'London',
  'Wandsworth': 'London',
  'Lambeth': 'London',
  'Southwark': 'London',
  'Tower Hamlets': 'London',
  'Hackney': 'London',
  'Islington': 'London',
  'Camden': 'London',
  'Brent': 'London',
  'Ealing': 'London',
  'Hounslow': 'London',
  'Richmond upon Thames': 'London',
  'Kingston upon Thames': 'London',
  'Merton': 'London',
  'Sutton': 'London',
  'Croydon': 'London',
  'Bromley': 'London',
  'Lewisham': 'London',
  'Greenwich': 'London',
  'Bexley': 'London',
  'Havering': 'London',
  'Barking and Dagenham': 'London',
  'Redbridge': 'London',
  'Newham': 'London',
  'Waltham Forest': 'London',
  'Haringey': 'London',
  'Enfield': 'London',
  'Barnet': 'London',
  'Harrow': 'London',
  'Hillingdon': 'London',
  // Other common mappings
  'Greater London': 'London',
  'Greater Manchester': 'Manchester',
  'West Midlands': 'Birmingham',
};

async function geocodeAddressWithNominatim(address: string): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VoiceoverStudioFinder/1.0 (https://vostudiofinder.com)', // Required by Nominatim
      }
    });

    if (!response.ok) {
      console.log(`  ⚠️  HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data: NominatimResult[] = await response.json();

    if (!data || data.length === 0 || !data[0].address) {
      return null;
    }

    const addr = data[0].address;
    
    // Extract city with preference order: city > town > village > municipality > county > state
    let city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district;
    
    // Map UK boroughs/districts to their parent cities
    if (city && UK_CITY_MAPPINGS[city]) {
      city = UK_CITY_MAPPINGS[city];
    }
    
    // Special handling for Greater London in state field
    if (!city && addr.state && UK_CITY_MAPPINGS[addr.state]) {
      city = UK_CITY_MAPPINGS[addr.state];
    }
    
    return city || null;
  } catch (error) {
    console.error(`  ❌ Geocoding error:`, error);
    return null;
  }
}

async function populateCitiesWithNominatim() {
  console.log('🌍 Populating city fields using Nominatim (OpenStreetMap)...\n');
  console.log('ℹ️  This is completely FREE and requires no API key!\n');

  try {
    // Find all studios with full_address
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
    console.log(`⏱️  Note: Processing at 1 request per second (Nominatim usage policy)\n`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    for (let i = 0; i < studios.length; i++) {
      const studio = studios[i];
      
      if (!studio.full_address) {
        unchanged++;
        continue;
      }

      try {
        console.log(`[${i + 1}/${studios.length}] ${studio.name}`);
        console.log(`  Address: ${studio.full_address}`);
        console.log(`  Current City: ${studio.city || '(none)'}`);
        
        const city = await geocodeAddressWithNominatim(studio.full_address);

        if (!city) {
          console.log(`  ⚠️  Could not extract city\n`);
          unchanged++;
          continue;
        }

        // Check if city changed
        if (studio.city === city) {
          console.log(`  ✓ City already correct: "${city}"\n`);
          unchanged++;
          continue;
        }

        // Update the studio
        await prisma.studios.update({
          where: { id: studio.id },
          data: { city: city.trim() },
        });

        updated++;
        console.log(`  ✅ Updated: "${studio.city || '(none)'}" → "${city}"\n`);

      } catch (error) {
        errors++;
        console.error(`  ❌ Error:`, error);
        console.log('');
      }

      // IMPORTANT: Wait 1 second between requests (Nominatim usage policy)
      // This makes the script slow but keeps us compliant with their terms
      if (i < studios.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Unchanged: ${unchanged}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n✅ Complete!`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

populateCitiesWithNominatim();


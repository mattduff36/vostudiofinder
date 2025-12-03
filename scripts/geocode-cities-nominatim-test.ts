import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();

// Nominatim (OpenStreetMap) - Free, no API key required!
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
  };
}

// Known UK cities and their boroughs/districts
const UK_CITY_MAPPINGS: Record<string, string> = {
  'City of London': 'London',
  'City of Westminster': 'London',
  'Greater London': 'London',
  'Greater Manchester': 'Manchester',
  'West Midlands': 'Birmingham',
};

async function geocodeAddressWithNominatim(address: string): Promise<string | null> {
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
    
    if (city && UK_CITY_MAPPINGS[city]) {
      city = UK_CITY_MAPPINGS[city];
    }
    
    if (!city && addr.state && UK_CITY_MAPPINGS[addr.state]) {
      city = UK_CITY_MAPPINGS[addr.state];
    }
    
    return city || null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}

async function testGeocoding() {
  console.log('🧪 Testing Nominatim Geocoding (first 5 UK studios)...\n');

  try {
    // Get 5 UK studios with addresses
    const studios = await prisma.studios.findMany({
      where: {
        full_address: {
          contains: 'UK',
        },
      },
      select: {
        id: true,
        name: true,
        full_address: true,
        city: true,
      },
      take: 5,
    });

    console.log(`Testing ${studios.length} studios:\n`);

    for (const studio of studios) {
      if (!studio.full_address) continue;

      console.log(`Studio: ${studio.name}`);
      console.log(`Address: ${studio.full_address}`);
      console.log(`Current City: ${studio.city || '(none)'}`);
      
      const newCity = await geocodeAddressWithNominatim(studio.full_address);
      console.log(`Geocoded City: ${newCity || '(not found)'}`);
      
      if (newCity && newCity !== studio.city) {
        console.log(`✅ Would update: "${studio.city || '(none)'}" → "${newCity}"`);
      } else if (newCity === studio.city) {
        console.log(`✓ Already correct`);
      } else {
        console.log(`⚠️  Could not geocode`);
      }
      
      console.log('');
      
      // Wait 1 second (Nominatim policy)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGeocoding();


import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const prisma = new PrismaClient();
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface GeocodeResult {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  status: string;
  error_message?: string;
}

async function geocodeAddress(address: string): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data: GeocodeResult = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      console.log('\n❌ Google Geocoding API Error:', data.error_message);
      console.log('   This API key has referer restrictions and cannot be used server-side.');
      console.log('   You need to either:');
      console.log('   1. Create a new unrestricted API key for server-side use');
      console.log('   2. Or enable Geocoding API on an existing server-side key\n');
      process.exit(1);
    }

    if (data.status !== 'OK' || !data.results[0]) {
      return null;
    }

    // Extract city from address components
    const components = data.results[0].address_components;
    
    // Look for city in order of preference: locality, postal_town, administrative_area_level_2
    const cityTypes = ['locality', 'postal_town', 'administrative_area_level_2'];
    
    for (const typePreference of cityTypes) {
      const cityComponent = components.find(c => c.types.includes(typePreference));
      if (cityComponent) {
        return cityComponent.long_name;
      }
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function populateCitiesWithGeocoding() {
  console.log('🌍 Populating city fields using Google Geocoding API...\n');

  try {
    // Find all studios with full_address but needing city updates
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
    let errors = 0;

    for (const studio of studios) {
      if (!studio.full_address) {
        unchanged++;
        continue;
      }

      try {
        console.log(`Processing: ${studio.name}`);
        console.log(`  Address: ${studio.full_address}`);
        
        const city = await geocodeAddress(studio.full_address);

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
        console.log(`  ✅ Updated: "${studio.city}" → "${city}"\n`);

        // Rate limiting - wait 100ms between requests to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errors++;
        console.error(`  ❌ Error:`, error);
        console.log('');
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

populateCitiesWithGeocoding();


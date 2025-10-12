import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address?: string;
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found in environment variables');
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address,
      };
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn(`  ⚠️  No results found for address: ${address}`);
      return null;
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Maps API rate limit exceeded. Please try again later.');
    } else {
      console.warn(`  ⚠️  Geocoding failed for address: ${address} (Status: ${data.status})`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Error geocoding address: ${address}`, error);
    return null;
  }
}

async function geocodeMissingStudios() {
  console.log('🔍 Finding studios with missing coordinates...\n');

  // Find all studios that have an address but missing latitude or longitude
  const studiosWithoutCoords = await prisma.studios.findMany({
    where: {
      address: {
        not: null,
        not: '',
      },
      OR: [
        { latitude: null },
        { longitude: null },
      ],
    },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  console.log(`📊 Found ${studiosWithoutCoords.length} studios missing coordinates\n`);

  if (studiosWithoutCoords.length === 0) {
    console.log('✅ All studios with addresses already have coordinates!');
    return;
  }

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < studiosWithoutCoords.length; i++) {
    const studio = studiosWithoutCoords[i];
    const progress = `[${i + 1}/${studiosWithoutCoords.length}]`;

    console.log(`\n${progress} Processing: ${studio.name}`);
    console.log(`  📍 Address: ${studio.address}`);

    if (!studio.address || studio.address.trim() === '') {
      console.log(`  ⏭️  Skipped: No valid address`);
      skippedCount++;
      continue;
    }

    try {
      // Add a small delay to avoid hitting rate limits
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between requests
      }

      const result = await geocodeAddress(studio.address);

      if (result) {
        // Update the studio with the new coordinates
        await prisma.studios.update({
          where: { id: studio.id },
          data: {
            latitude: result.lat,
            longitude: result.lng,
          },
        });

        console.log(`  ✅ Success: Updated coordinates to (${result.lat}, ${result.lng})`);
        if (result.formatted_address && result.formatted_address !== studio.address) {
          console.log(`  ℹ️  Formatted address: ${result.formatted_address}`);
        }
        successCount++;
      } else {
        console.log(`  ❌ Failed: Could not geocode address`);
        failureCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error processing studio: ${error}`);
      failureCount++;
      
      // If we hit rate limit, stop processing
      if (error instanceof Error && error.message.includes('rate limit')) {
        console.error('\n⚠️  Rate limit exceeded. Stopping process.');
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Geocoding Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully geocoded: ${successCount} studios`);
  console.log(`❌ Failed to geocode: ${failureCount} studios`);
  console.log(`⏭️  Skipped (no address): ${skippedCount} studios`);
  console.log(`📍 Total processed: ${successCount + failureCount + skippedCount}/${studiosWithoutCoords.length}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('🚀 Starting geocoding process...\n');
  
  try {
    await geocodeMissingStudios();
    console.log('✅ Geocoding process completed successfully!\n');
  } catch (error) {
    console.error('❌ Fatal error during geocoding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


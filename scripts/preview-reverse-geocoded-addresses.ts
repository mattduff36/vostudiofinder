import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

/**
 * Reverse geocode coordinates to address using Google Maps API
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // Use server-side API key if available, otherwise fall back to client key
  const serverKey = process.env.GOOGLE_MAPS_API_KEY;
  const clientKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const apiKey = serverKey || clientKey;
  
  if (!apiKey) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    if (data.status === 'REQUEST_DENIED') {
      console.error(`[Reverse Geocoding] Request denied: ${data.error_message || 'Check API key permissions'}`);
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

async function previewReverseGeocodedAddresses() {
  console.log('🔍 Finding studios with coordinates...\n');

  try {
    // Find all studios that have coordinates
    const studios = await prisma.studios.findMany({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        full_address: true,
        address: true, // Legacy field for comparison
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`📊 Found ${studios.length} studios with coordinates\n`);
    console.log('🔄 Starting reverse geocoding (this may take a while due to rate limits)...\n');
    console.log('='.repeat(120));

    const results: Array<{
      name: string;
      id: string;
      coordinates: string;
      currentFullAddress: string;
      reverseGeocodedAddress: string | null;
      changed: boolean;
    }> = [];

    let successCount = 0;
    let failureCount = 0;
    let unchangedCount = 0;
    let changedCount = 0;

    for (let i = 0; i < studios.length; i++) {
      const studio = studios[i];
      const progress = `[${i + 1}/${studios.length}]`;
      
      const lat = parseFloat(studio.latitude!.toString());
      const lng = parseFloat(studio.longitude!.toString());
      const coordinates = `${lat}, ${lng}`;
      const currentFullAddress = studio.full_address || studio.address || '(empty)';

      // Add delay to avoid rate limits (1 request per second for free tier)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      }

      const reverseGeocodedAddress = await reverseGeocode(lat, lng);
      
      const changed = reverseGeocodedAddress && 
                      reverseGeocodedAddress !== currentFullAddress &&
                      currentFullAddress !== '(empty)';

      results.push({
        name: studio.name,
        id: studio.id,
        coordinates,
        currentFullAddress,
        reverseGeocodedAddress: reverseGeocodedAddress || '(failed)',
        changed: changed || false,
      });

      if (reverseGeocodedAddress) {
        successCount++;
        if (changed) {
          changedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        failureCount++;
      }

      // Show progress every 10 studios
      if ((i + 1) % 10 === 0 || i === studios.length - 1) {
        console.log(`${progress} Processed ${i + 1} studios... (${successCount} success, ${failureCount} failed)`);
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 REVERSE GEOCODING PREVIEW RESULTS\n');
    console.log('='.repeat(120));

    // Display results in a table format
    console.log('\n');
    console.log('Studio Name'.padEnd(40) + ' | Current Full Address'.padEnd(50) + ' | Reverse Geocoded Address');
    console.log('-'.repeat(120));

    // Show first 50 results, then summary
    const displayCount = Math.min(50, results.length);
    
    for (let i = 0; i < displayCount; i++) {
      const result = results[i];
      const name = (result.name.length > 38 ? result.name.substring(0, 35) + '...' : result.name).padEnd(40);
      const current = (result.currentFullAddress.length > 48 ? result.currentFullAddress.substring(0, 45) + '...' : result.currentFullAddress).padEnd(50);
      const newAddr = result.reverseGeocodedAddress.length > 60 ? result.reverseGeocodedAddress.substring(0, 57) + '...' : result.reverseGeocodedAddress;
      const marker = result.changed ? ' ⚠️ CHANGED' : '';
      
      console.log(`${name} | ${current} | ${newAddr}${marker}`);
    }

    if (results.length > displayCount) {
      console.log(`\n... and ${results.length - displayCount} more studios (see summary below)`);
    }

    // Summary statistics
    console.log('\n' + '='.repeat(120));
    console.log('\n📊 SUMMARY STATISTICS\n');
    console.log('='.repeat(120));
    console.log(`Total studios processed: ${studios.length}`);
    console.log(`✅ Successfully reverse geocoded: ${successCount}`);
    console.log(`❌ Failed to reverse geocode: ${failureCount}`);
    console.log(`\n📝 Address Changes:`);
    console.log(`   • Addresses that would change: ${changedCount}`);
    console.log(`   • Addresses that would stay the same: ${unchangedCount}`);
    console.log(`   • Currently empty addresses filled: ${results.filter(r => r.currentFullAddress === '(empty)' && r.reverseGeocodedAddress !== '(failed)').length}`);

    // Show some examples of changed addresses
    const changedResults = results.filter(r => r.changed).slice(0, 10);
    if (changedResults.length > 0) {
      console.log(`\n📋 Examples of addresses that would change (showing first ${Math.min(10, changedResults.length)}):`);
      console.log('-'.repeat(120));
      changedResults.forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.name}`);
        console.log(`   Current:  ${result.currentFullAddress}`);
        console.log(`   New:      ${result.reverseGeocodedAddress}`);
      });
    }

    // Show some examples of empty addresses being filled
    const filledResults = results.filter(r => r.currentFullAddress === '(empty)' && r.reverseGeocodedAddress !== '(failed)').slice(0, 5);
    if (filledResults.length > 0) {
      console.log(`\n📋 Examples of empty addresses that would be filled (showing first ${Math.min(5, filledResults.length)}):`);
      console.log('-'.repeat(120));
      filledResults.forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.name}`);
        console.log(`   Coordinates: ${result.coordinates}`);
        console.log(`   New Address: ${result.reverseGeocodedAddress}`);
      });
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n⚠️  NOTE: No database changes were made. This is a preview only.');
    console.log('='.repeat(120));

  } catch (error) {
    console.error('❌ Error processing studios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

previewReverseGeocodedAddresses();


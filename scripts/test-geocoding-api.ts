import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

/**
 * Test reverse geocoding with a known location
 */
async function testReverseGeocoding() {
  console.log('🧪 Testing Google Geocoding API...\n');

  // Use server-side API key if available, otherwise fall back to client key
  const serverKey = process.env.GOOGLE_MAPS_API_KEY;
  const clientKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const apiKey = serverKey || clientKey;
  
  if (!apiKey) {
    console.error('❌ Google Maps API key not configured');
    return;
  }

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  console.log(`Using API key: ${maskKey(apiKey)}`);
  if (serverKey) {
    console.log('Key type: Server-side (GOOGLE_MAPS_API_KEY)');
  } else {
    console.log('Key type: Client-side (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)');
  }
  console.log('');

  // Test with a known location (Big Ben, London)
  const testLat = 51.4994;
  const testLng = -0.1245;
  
  console.log(`Testing reverse geocoding for coordinates: ${testLat}, ${testLng}`);
  console.log('Expected location: Big Ben, London, UK\n');

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    console.log('API Response Status:', data.status);
    
    if (data.status === 'OK' && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      console.log('✅ SUCCESS! Reverse geocoding is working!');
      console.log(`\nReverse geocoded address: ${address}`);
      console.log('\n✅ The Google Geocoding API is active and working correctly!');
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ REQUEST DENIED');
      console.error(`Error message: ${data.error_message || 'No specific error message'}`);
      console.error('\n⚠️  The API key still has restrictions that prevent server-side geocoding.');
      console.error('   You need to remove HTTP referrer restrictions or use IP restrictions instead.');
      return false;
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn('⚠️  ZERO RESULTS - No address found for these coordinates');
      return false;
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('❌ OVER QUERY LIMIT - API quota exceeded');
      return false;
    } else {
      console.error(`❌ UNEXPECTED STATUS: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return false;
  }
}

// Also test forward geocoding
async function testForwardGeocoding() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing forward geocoding (address to coordinates)...\n');

  const serverKey = process.env.GOOGLE_MAPS_API_KEY;
  const clientKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const apiKey = serverKey || clientKey;

  const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA';
  console.log(`Testing forward geocoding for address: ${testAddress}`);
  console.log('Expected location: Google HQ, Mountain View, CA\n');

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    console.log('API Response Status:', data.status);
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      console.log('✅ SUCCESS! Forward geocoding is working!');
      console.log(`\nGeocoded coordinates: ${location.lat}, ${location.lng}`);
      console.log(`Formatted address: ${result.formatted_address}`);
      console.log('\n✅ The Google Geocoding API is active and working correctly!');
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('❌ REQUEST DENIED');
      console.error(`Error message: ${data.error_message || 'No specific error message'}`);
      return false;
    } else {
      console.error(`❌ Status: ${data.status}`);
      if (data.error_message) {
        console.error(`Error message: ${data.error_message}`);
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('GOOGLE GEOCODING API TEST');
  console.log('='.repeat(60));
  console.log('');

  const reverseTest = await testReverseGeocoding();
  const forwardTest = await testForwardGeocoding();

  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Reverse Geocoding (coordinates → address): ${reverseTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Forward Geocoding (address → coordinates): ${forwardTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));

  if (reverseTest && forwardTest) {
    console.log('\n🎉 All tests passed! The Google Geocoding API is fully functional.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the error messages above.');
  }
}

runTests();


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Check if an address looks like a complete, full address
 * (not just a country name or very short)
 */
function isCompleteAddress(address: string | null | undefined): boolean {
  if (!address || address.trim() === '') return false;
  
  const trimmed = address.trim();
  
  // Very short addresses are likely incomplete
  if (trimmed.length < 10) return false;
  
  // Common country-only addresses
  const countryOnlyPatterns = [
    /^(United States|United Kingdom|Canada|Australia|France|Germany|Spain|Italy|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Ireland|Portugal|Poland|Greece|Czech Republic|Hungary|Romania|Bulgaria|Croatia|Slovakia|Slovenia|Estonia|Latvia|Lithuania|Luxembourg|Malta|Cyprus|Iceland|Liechtenstein|Monaco|San Marino|Vatican City|Andorra)$/i,
    /^(USA|UK|U\.S\.A\.|U\.K\.)$/i,
    /^(India|China|Japan|South Korea|Brazil|Mexico|Argentina|Chile|Colombia|Peru|Venezuela|Ecuador|Bolivia|Paraguay|Uruguay|Guyana|Suriname|French Guiana)$/i,
    /^(Russia|Ukraine|Belarus|Kazakhstan|Uzbekistan|Azerbaijan|Armenia|Georgia|Moldova|Kyrgyzstan|Tajikistan|Turkmenistan)$/i,
    /^(Egypt|South Africa|Nigeria|Kenya|Morocco|Tunisia|Algeria|Ethiopia|Ghana|Tanzania|Uganda|Sudan|Angola|Mozambique|Madagascar|Cameroon|Ivory Coast|Niger|Burkina Faso|Mali|Malawi|Zambia|Senegal|Zimbabwe|Chad|Guinea|Rwanda|Benin|Burundi|Tunisia|Somalia|Guinea-Bissau|Eritrea|Sierra Leone|Togo|Central African Republic|Liberia|Mauritania|Lesotho|Gambia|Botswana|Namibia|Gabon|Mauritius|Eswatini|Djibouti|Equatorial Guinea|Comoros|Cape Verde|Sao Tome and Principe|Seychelles)$/i,
    /^(Thailand|Vietnam|Indonesia|Philippines|Malaysia|Singapore|Myanmar|Cambodia|Laos|Brunei|East Timor|Mongolia|Nepal|Bhutan|Bangladesh|Sri Lanka|Maldives|Afghanistan|Pakistan|Iran|Iraq|Saudi Arabia|United Arab Emirates|Israel|Jordan|Lebanon|Syria|Yemen|Oman|Kuwait|Qatar|Bahrain|Turkey)$/i,
  ];
  
  // Check if it's just a country name
  for (const pattern of countryOnlyPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  // Check if it contains indicators of a complete address:
  // - Street numbers (digits at start or after comma)
  // - Postcodes (UK format: letters + numbers, or just numbers in many countries)
  // - Street names (words like "Street", "Road", "Avenue", "Lane", etc.)
  // - City names (usually followed by comma or postcode)
  
  const hasStreetNumber = /\d+/.test(trimmed); // Contains numbers
  const hasStreetName = /\b(Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Court|Ct|Place|Pl|Close|Crescent|Cres|Grove|Gardens|Gdns|Square|Sq|Terrace|Ter|Park|Hill|View|Mews|Walk|Row|Green|Common|Heath|Moor|Bridge|Gate|End|Corner|Junction|Cross|Roundabout|Circus|Vale|Dale|Rise|Mount|Mountain|Valley|Wood|Forest|Field|Meadow|Orchard|Garden|Yard|Alley|Path|Track|Route|Highway|Freeway|Motorway|Turnpike)\b/i.test(trimmed);
  const hasPostcode = /\b[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}\b/i.test(trimmed) || // UK format
                      /\b\d{4,6}\b/.test(trimmed) || // Numeric postcodes
                      /\b\d{5}(-\d{4})?\b/.test(trimmed); // US ZIP codes
  
  // If it has at least 2 of these indicators, it's likely a complete address
  const indicators = [hasStreetNumber, hasStreetName, hasPostcode].filter(Boolean).length;
  
  return indicators >= 2 || (hasStreetNumber && trimmed.length > 20);
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function analyzeAddressQuality() {
  console.log('🔍 Analyzing address quality and coordinate matching...\n');

  try {
    // Get all studios with coordinates
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
        address: true, // Legacy field
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`📊 Found ${studios.length} studios with coordinates\n`);
    console.log('='.repeat(100));

    const results = {
      total: studios.length,
      withFullAddress: 0,
      withCompleteAddress: 0,
      withIncompleteAddress: 0,
      withoutAddress: 0,
      addressBreakdown: {
        countryOnly: 0,
        postcodeOnly: 0,
        partialAddress: 0,
        completeAddress: 0,
      },
    };

    // Analyze each studio
    studios.forEach((studio) => {
      const fullAddress = studio.full_address || studio.address || null;
      const lat = parseFloat(studio.latitude!.toString());
      const lng = parseFloat(studio.longitude!.toString());

      if (fullAddress) {
        results.withFullAddress++;
        
        if (isCompleteAddress(fullAddress)) {
          results.withCompleteAddress++;
          results.addressBreakdown.completeAddress++;
        } else {
          results.withIncompleteAddress++;
          
          // Categorize incomplete addresses
          const trimmed = fullAddress.trim();
          if (trimmed.length < 10 || /^(United States|United Kingdom|Canada|Australia|France|Germany|Spain|Italy|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Ireland|Portugal|Poland|Greece|Czech Republic|Hungary|Romania|Bulgaria|Croatia|Slovakia|Slovenia|Estonia|Latvia|Lithuania|Luxembourg|Malta|Cyprus|Iceland|Liechtenstein|Monaco|San Marino|Vatican City|Andorra|USA|UK|U\.S\.A\.|U\.K\.|India|China|Japan|South Korea|Brazil|Mexico|Argentina|Chile|Colombia|Peru|Venezuela|Ecuador|Bolivia|Paraguay|Uruguay|Guyana|Suriname|French Guiana|Russia|Ukraine|Belarus|Kazakhstan|Uzbekistan|Azerbaijan|Armenia|Georgia|Moldova|Kyrgyzstan|Tajikistan|Turkmenistan|Egypt|South Africa|Nigeria|Kenya|Morocco|Tunisia|Algeria|Ethiopia|Ghana|Tanzania|Uganda|Sudan|Angola|Mozambique|Madagascar|Cameroon|Ivory Coast|Niger|Burkina Faso|Mali|Malawi|Zambia|Senegal|Zimbabwe|Chad|Guinea|Rwanda|Benin|Burundi|Tunisia|Somalia|Guinea-Bissau|Eritrea|Sierra Leone|Togo|Central African Republic|Liberia|Mauritania|Lesotho|Gambia|Botswana|Namibia|Gabon|Mauritius|Eswatini|Djibouti|Equatorial Guinea|Comoros|Cape Verde|Sao Tome and Principe|Seychelles|Thailand|Vietnam|Indonesia|Philippines|Malaysia|Singapore|Myanmar|Cambodia|Laos|Brunei|East Timor|Mongolia|Nepal|Bhutan|Bangladesh|Sri Lanka|Maldives|Afghanistan|Pakistan|Iran|Iraq|Saudi Arabia|United Arab Emirates|Israel|Jordan|Lebanon|Syria|Yemen|Oman|Kuwait|Qatar|Bahrain|Turkey)$/i.test(trimmed)) {
            results.addressBreakdown.countryOnly++;
          } else if (/^\w{1,2}\d{1,2}\s?\d\w{2}$/i.test(trimmed) || /^\d{4,6}$/.test(trimmed) || /^\d{5}(-\d{4})?$/.test(trimmed)) {
            results.addressBreakdown.postcodeOnly++;
          } else {
            results.addressBreakdown.partialAddress++;
          }
        }
      } else {
        results.withoutAddress++;
      }
    });

    // Display results
    console.log('\n📊 ADDRESS QUALITY ANALYSIS\n');
    console.log('='.repeat(100));
    console.log(`Total studios with coordinates: ${results.total}`);
    console.log(`\nAddress Status:`);
    console.log(`  ✅ Studios with full_address: ${results.withFullAddress} (${((results.withFullAddress / results.total) * 100).toFixed(1)}%)`);
    console.log(`  📝 Studios with COMPLETE addresses: ${results.withCompleteAddress} (${((results.withCompleteAddress / results.total) * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  Studios with INCOMPLETE addresses: ${results.withIncompleteAddress} (${((results.withIncompleteAddress / results.total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Studios without address: ${results.withoutAddress} (${((results.withoutAddress / results.total) * 100).toFixed(1)}%)`);
    
    console.log(`\n📋 Incomplete Address Breakdown:`);
    console.log(`  🌍 Country-only addresses: ${results.addressBreakdown.countryOnly}`);
    console.log(`  📮 Postcode-only addresses: ${results.addressBreakdown.postcodeOnly}`);
    console.log(`  📄 Partial addresses: ${results.addressBreakdown.partialAddress}`);
    console.log(`  ✅ Complete addresses: ${results.addressBreakdown.completeAddress}`);

    // Show some examples
    console.log(`\n📋 Examples of Complete Addresses (first 10):`);
    console.log('-'.repeat(100));
    let completeCount = 0;
    for (const studio of studios) {
      const fullAddress = studio.full_address || studio.address;
      if (fullAddress && isCompleteAddress(fullAddress)) {
        completeCount++;
        console.log(`${completeCount}. ${studio.name}`);
        console.log(`   Address: ${fullAddress}`);
        if (completeCount >= 10) break;
      }
    }

    console.log(`\n📋 Examples of Incomplete Addresses (first 10):`);
    console.log('-'.repeat(100));
    let incompleteCount = 0;
    for (const studio of studios) {
      const fullAddress = studio.full_address || studio.address;
      if (fullAddress && !isCompleteAddress(fullAddress)) {
        incompleteCount++;
        console.log(`${incompleteCount}. ${studio.name}`);
        console.log(`   Address: ${fullAddress}`);
        if (incompleteCount >= 10) break;
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n💡 RECOMMENDATION:');
    console.log('='.repeat(100));
    
    const completePercentage = (results.withCompleteAddress / results.total) * 100;
    
    if (completePercentage >= 80) {
      console.log('✅ Most addresses are complete! You may not need reverse geocoding.');
      console.log('   Consider using addresses directly in the map component.');
    } else if (completePercentage >= 50) {
      console.log('⚠️  About half the addresses are complete.');
      console.log('   You could:');
      console.log('   1. Use addresses as-is and geocode on client-side when displaying maps');
      console.log('   2. Reverse geocode only the incomplete addresses');
    } else {
      console.log('❌ Most addresses are incomplete (country names, postcodes only, etc.).');
      console.log('   Recommendation: Reverse geocode all addresses to get proper full addresses.');
    }

    console.log('\n' + '='.repeat(100));

  } catch (error) {
    console.error('❌ Error analyzing studios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAddressQuality();


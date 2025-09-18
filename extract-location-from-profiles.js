// Extract location information from profile descriptions and other fields
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Common location patterns to search for
const locationPatterns = [
  // Cities with state/province/country
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  // Cities with state/province
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  // Specific location keywords
  /\b(?:located|based|studio|office|headquarters|HQ)\s+(?:in|at|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)\b/gi,
  // "in [Location]" patterns
  /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)\b/g,
  // "from [Location]" patterns
  /\bfrom\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)*)\b/g,
  // UK Postcodes
  /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/gi,
  // US ZIP codes
  /\b[0-9]{5}(?:-[0-9]{4})?\b/g,
  // Specific geographic features
  /\b([A-Z][a-z]+\s+(?:Island|Bay|Valley|Mountain|Hills?|Beach|Coast|River|Lake|County|District|Region|Area))\b/g,
  // State/Province abbreviations
  /\b[A-Z]{2}\s*,?\s*(?:USA|US|Canada|CA|UK|United Kingdom|Australia|AU)\b/gi
];

// Known cities, regions, and geographic features for validation
const knownLocations = [
  // Major cities
  'Vancouver', 'Toronto', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City',
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Sheffield', 'Edinburgh', 'Glasgow',
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
  'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'San Francisco', 'Indianapolis', 'Columbus', 'Fort Worth',
  'Charlotte', 'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Baltimore', 'Portland', 'Las Vegas',
  'Detroit', 'Memphis', 'Louisville', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Atlanta',
  'Miami', 'Tampa', 'New Orleans', 'Cleveland', 'Minneapolis', 'Orlando', 'St. Petersburg', 'Norfolk',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra',
  'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Brussels', 'Vienna', 'Stockholm', 'Copenhagen',
  // Geographic features
  'Vancouver Island', 'Long Island', 'Staten Island', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx',
  'Silicon Valley', 'San Francisco Bay Area', 'Greater London', 'West End', 'East End',
  // States/Provinces/Regions
  'British Columbia', 'Ontario', 'Quebec', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia',
  'New Brunswick', 'Prince Edward Island', 'Newfoundland', 'Northwest Territories', 'Yukon', 'Nunavut',
  'California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois', 'Ohio', 'Georgia',
  'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 'Washington', 'Arizona', 'Massachusetts',
  'Tennessee', 'Indiana', 'Missouri', 'Maryland', 'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina',
  'Alabama', 'Louisiana', 'Kentucky', 'Oregon', 'Oklahoma', 'Connecticut', 'Utah', 'Iowa', 'Nevada',
  'Arkansas', 'Mississippi', 'Kansas', 'New Mexico', 'Nebraska', 'West Virginia', 'Idaho', 'Hawaii',
  'New Hampshire', 'Maine', 'Montana', 'Rhode Island', 'Delaware', 'South Dakota', 'North Dakota',
  'Alaska', 'Vermont', 'Wyoming'
];

function extractLocationsFromText(text) {
  if (!text) return [];
  
  const locations = new Set();
  
  // Apply each pattern
  locationPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean up the match
        let location = match.replace(/^(located|based|studio|office|headquarters|HQ|in|from)\s+/gi, '')
                           .replace(/^(in|at|on)\s+/gi, '')
                           .trim();
        
        // Remove common non-location words
        location = location.replace(/\b(the|a|an|and|or|of|for|with|by|to|from|in|at|on)\b/gi, '').trim();
        
        if (location.length > 2) {
          locations.add(location);
        }
      });
    }
  });
  
  // Validate against known locations
  const validatedLocations = [];
  locations.forEach(location => {
    const isKnown = knownLocations.some(known => 
      location.toLowerCase().includes(known.toLowerCase()) || 
      known.toLowerCase().includes(location.toLowerCase())
    );
    
    if (isKnown || location.length > 10) { // Include longer strings that might be valid
      validatedLocations.push(location);
    }
  });
  
  return validatedLocations;
}

function estimateLocationPrecision(location) {
  if (!location) return 'Unknown';
  
  const loc = location.toLowerCase();
  
  // UK Postcodes
  if (/^[a-z]{1,2}[0-9][a-z0-9]?\s?[0-9][a-z]{2}$/i.test(location)) return 'Postcode (Excellent)';
  if (/^[a-z]{1,2}[0-9][a-z0-9]?\s?[0-9]$/i.test(location)) return 'Postcode Area (Very Good)';
  
  // US ZIP codes
  if (/^[0-9]{5}(-[0-9]{4})?$/.test(location)) return 'ZIP Code (Very Good)';
  
  // City, State combinations
  if (location.includes(',')) return 'City, State (Good)';
  
  // Specific geographic features
  if (loc.includes('island') || loc.includes('bay') || loc.includes('valley') || 
      loc.includes('mountain') || loc.includes('hills') || loc.includes('beach') ||
      loc.includes('coast') || loc.includes('county') || loc.includes('district')) {
    return 'Geographic Feature (Good)';
  }
  
  // Major cities
  const majorCities = ['vancouver', 'toronto', 'montreal', 'london', 'manchester', 'new york', 'los angeles', 'chicago', 'sydney', 'melbourne'];
  if (majorCities.some(city => loc.includes(city))) return 'Major City (Good)';
  
  // States/Provinces
  const regions = ['british columbia', 'ontario', 'california', 'texas', 'florida', 'new york'];
  if (regions.some(region => loc.includes(region))) return 'State/Province (Fair)';
  
  return 'Unknown Precision';
}

async function analyzeProfileLocations() {
  try {
    console.log('🔍 EXTRACTING LOCATION INFORMATION FROM PROFILE DESCRIPTIONS...');
    
    // Get all profiles with poor location data but rich text content
    const profiles = await turso.execute(`
      SELECT 
        p.user_id,
        p.first_name,
        p.last_name,
        p.location,
        p.address,
        p.about,
        p.shortabout,
        p.homestudio,
        p.homestudio2,
        p.homestudio3,
        p.homestudio4,
        p.homestudio5,
        p.homestudio6,
        p.latitude,
        p.longitude,
        u.email,
        u.username
      FROM profile p
      JOIN users u ON p.user_id = u.id
      WHERE (p.latitude IS NULL OR p.longitude IS NULL)
      AND (p.about IS NOT NULL OR p.shortabout IS NOT NULL OR 
           p.homestudio IS NOT NULL OR p.homestudio2 IS NOT NULL OR
           p.homestudio3 IS NOT NULL OR p.homestudio4 IS NOT NULL OR
           p.homestudio5 IS NOT NULL OR p.homestudio6 IS NOT NULL)
      ORDER BY p.first_name
      LIMIT 20
    `);
    
    console.log(`\nAnalyzing ${profiles.rows.length} profiles with rich text content...\n`);
    
    const results = [];
    
    profiles.rows.forEach(row => {
      const profile = {};
      profiles.columns.forEach((col, index) => {
        profile[col] = row[index];
      });
      
      // Combine all text fields for location extraction
      const textFields = [
        profile.about,
        profile.shortabout,
        profile.homestudio,
        profile.homestudio2,
        profile.homestudio3,
        profile.homestudio4,
        profile.homestudio5,
        profile.homestudio6
      ].filter(Boolean);
      
      const allText = textFields.join(' ');
      const extractedLocations = extractLocationsFromText(allText);
      
      if (extractedLocations.length > 0) {
        results.push({
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          email: profile.email,
          username: profile.username,
          originalLocation: profile.location,
          extractedLocations: extractedLocations,
          bestLocation: extractedLocations[0], // Take the first/best match
          precision: estimateLocationPrecision(extractedLocations[0]),
          textSample: allText.substring(0, 150) + '...'
        });
      }
    });
    
    // Sort by precision quality
    const precisionOrder = {
      'Postcode (Excellent)': 1,
      'Postcode Area (Very Good)': 2,
      'ZIP Code (Very Good)': 3,
      'City, State (Good)': 4,
      'Geographic Feature (Good)': 5,
      'Major City (Good)': 6,
      'State/Province (Fair)': 7,
      'Unknown Precision': 8
    };
    
    results.sort((a, b) => {
      const orderA = precisionOrder[a.precision] || 8;
      const orderB = precisionOrder[b.precision] || 8;
      return orderA - orderB;
    });
    
    console.log('🎯 EXTRACTED LOCATION INFORMATION:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   Email: ${result.email}`);
      console.log(`   Original Location: "${result.originalLocation}"`);
      console.log(`   🎯 Extracted Location: "${result.bestLocation}"`);
      console.log(`   📊 Precision: ${result.precision}`);
      console.log(`   📝 Text Sample: ${result.textSample}`);
      
      if (result.extractedLocations.length > 1) {
        console.log(`   🔍 Other Locations Found: ${result.extractedLocations.slice(1).join(', ')}`);
      }
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log(`   Total profiles analyzed: ${profiles.rows.length}`);
    console.log(`   Profiles with extractable locations: ${results.length}`);
    
    const precisionCounts = {};
    results.forEach(result => {
      precisionCounts[result.precision] = (precisionCounts[result.precision] || 0) + 1;
    });
    
    console.log('\n📈 PRECISION BREAKDOWN:');
    Object.entries(precisionCounts).forEach(([precision, count]) => {
      console.log(`   ${precision}: ${count} profiles`);
    });
    
    console.log('\n💡 RECOMMENDATION:');
    const goodPrecision = results.filter(r => 
      ['Postcode (Excellent)', 'Postcode Area (Very Good)', 'ZIP Code (Very Good)', 
       'City, State (Good)', 'Geographic Feature (Good)', 'Major City (Good)'].includes(r.precision)
    );
    
    console.log(`   ✅ ${goodPrecision.length} profiles have good enough precision for geocoding`);
    console.log(`   ⚠️ ${results.length - goodPrecision.length} profiles have fair/poor precision`);
    console.log(`   🎯 This could add ${goodPrecision.length} more accurate map pins!`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeProfileLocations();

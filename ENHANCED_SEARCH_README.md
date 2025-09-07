# Enhanced Search Bar Implementation

## Overview

The enhanced search bar has been implemented to address the client's requirements for dynamic search detection and improved location-based searching with radius functionality.

## Key Features Implemented

### 1. Dynamic Search Type Detection
The search bar now intelligently detects what type of search the user is performing:

- **Location Search**: Detects city names, postcodes, addresses, and geographic locations
- **Studio Search**: Identifies studio names and recording-related terms
- **Service Search**: Recognizes audio equipment and service terms
- **Equipment Search**: Detects specific equipment models and technical terms

### 2. Google Places Integration
- Integrated Google Places Autocomplete API for location suggestions
- Provides accurate location suggestions with place IDs
- Falls back gracefully when Google Maps API is not available
- Supports multiple countries (US, UK, CA, AU)

### 3. Radius-Based Search
- Added radius slider (5-200 miles) similar to the original site
- Visual slider with custom styling matching the site's color scheme
- Collapsible radius controls to save space
- Radius parameter is passed to search API

### 4. Enhanced Suggestions API
- Prioritizes suggestions based on detected search type
- Returns metadata including coordinates and place IDs
- Improved relevance scoring with exact match prioritization
- Supports up to 8 suggestions per search

### 5. Improved Search Results
- Search parameters are properly mapped to the /studios page filters
- Location searches populate the location filter
- Studio searches populate the general query filter
- Service searches populate the services filter
- Radius is included in location-based searches

## Technical Implementation

### Components Created/Modified

1. **EnhancedSearchBar.tsx** - New comprehensive search component
2. **HeroSection.tsx** - Updated to use the enhanced search bar
3. **API Routes Enhanced**:
   - `/api/search/suggestions` - Enhanced with type detection
   - `/api/studios/search` - Improved location and radius handling

### Search Type Detection Logic

The system uses pattern matching to detect search intent:

```typescript
// Location patterns
/^[a-z\s]+,\s*[a-z\s]+$/i // City, Country/State
/^[a-z]{1,2}\d{1,2}\s*\d[a-z]{2}$/i // UK postcode
// + Major city names database

// Studio patterns  
/\b(studio|recording|audio|sound|voice)\b/i
/^[a-z0-9]+\s*(studio|recording)/i

// Service patterns
/\b(isdn|source\s*connect|cleanfeed|pro\s*tools)\b/i
```

### Google Places Integration

```typescript
// Loads Google Maps API with Places library
<Script
  src={`https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`}
  strategy="beforeInteractive"
/>

// Uses AutocompleteService for suggestions
const service = new google.maps.places.AutocompleteService();
service.getPlacePredictions({
  input: searchQuery,
  types: ['(cities)'],
  componentRestrictions: { country: ['us', 'gb', 'ca', 'au'] }
});
```

### Radius Slider Implementation

- Custom CSS styling for webkit and moz browsers
- Dynamic background gradient showing selected range
- Responsive design with mobile-friendly touch targets
- Values: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200 miles

## Usage Examples

### Location Search
- Input: "London" → Detects as location, shows Google Places suggestions
- Input: "SW1A 1AA" → Detects as UK postcode, searches location
- Input: "New York, NY" → Detects as city/state, searches location

### Studio Search  
- Input: "A1Vox" → Detects as studio name, searches studio profiles
- Input: "Abbey Road Studios" → Detects as studio, searches by name
- Input: "recording studio" → Detects as studio type, searches descriptions

### Service/Equipment Search
- Input: "Source Connect" → Detects as service, searches services
- Input: "Pro Tools" → Detects as equipment, searches equipment/services
- Input: "ISDN" → Detects as service, searches connection types

## Configuration

### Environment Variables Required
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Google Maps API Setup
1. Enable Places API in Google Cloud Console
2. Enable Maps JavaScript API
3. Set up API key restrictions for security
4. Add allowed domains/IPs

## Testing Scenarios

### Test Cases to Verify

1. **Location Detection**:
   - Type "London" → Should show Google Places suggestions
   - Select suggestion → Should navigate to /studios?location=London&radius=25
   - Verify radius slider works (5-200 miles)

2. **Studio Detection**:
   - Type "A1Vox" → Should show studio suggestions
   - Select studio → Should navigate to /studios?q=A1Vox

3. **Service Detection**:
   - Type "Source Connect" → Should show service suggestions
   - Select service → Should navigate to /studios?services=Source Connect

4. **Fallback Behavior**:
   - Without Google API key → Should show warning but still work
   - Network issues → Should gracefully degrade to local suggestions

## Performance Considerations

- Debounced API calls (300ms delay)
- Cached search results (5 minutes)
- Lazy loading of Google Maps API
- Optimized database queries with proper indexing
- Limited suggestion results (8 max) for performance

## Future Enhancements

1. **Geographic Distance Calculation**:
   - Implement PostGIS or similar for accurate radius searches
   - Use Haversine formula for distance calculations

2. **Search Analytics**:
   - Track search patterns and popular queries
   - A/B test different suggestion algorithms

3. **Advanced Filters**:
   - Price range filtering
   - Availability calendar integration
   - Equipment-specific searches

4. **Voice Search**:
   - Web Speech API integration
   - Voice-to-text search functionality

## Troubleshooting

### Common Issues

1. **Google Places not working**:
   - Check API key is set in environment variables
   - Verify Places API is enabled in Google Cloud Console
   - Check browser console for API errors

2. **Suggestions not appearing**:
   - Verify database connection
   - Check API route responses in Network tab
   - Ensure studios exist with ACTIVE status

3. **Radius search not working**:
   - Currently uses basic address matching
   - Full geographic search requires coordinate data
   - Consider implementing geocoding for addresses

### Debug Mode
Add `?debug=true` to URL to see search type detection and API responses in console.

## Deployment Notes

- Ensure Google Maps API key is set in production environment
- Test with production data to verify suggestion quality
- Monitor API usage to stay within Google Maps quotas
- Consider implementing rate limiting for search endpoints

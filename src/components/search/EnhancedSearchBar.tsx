'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building } from 'lucide-react';
import { colors } from '../home/HomePage';
import { formatUserSuggestion, calculateDistance, abbreviateAddress } from '@/lib/utils/address';
import { getCurrentLocation } from '@/lib/maps';

interface SearchSuggestion {
  id: string;
  text: string;
  location?: string;
  type: 'location' | 'user';
  distance?: number; // Distance in km from user's location
  metadata?: {
    place_id?: string;
    user_id?: string;
    coordinates?: { lat: number; lng: number };
    full_location?: string;
    full_address?: string;
  };
}

interface EnhancedSearchBarProps {
  placeholder?: string;
  className?: string;
  showRadius?: boolean;
  onSearch?: (location: string, coordinates?: { lat: number; lng: number }, radius?: number) => void;
}

// Function to abbreviate location names for search dropdown
const abbreviateLocationName = (fullAddress: string): string => {
  // Use the existing abbreviateAddress function but with more aggressive abbreviation
  const abbreviated = abbreviateAddress(fullAddress);
  
  // Further simplify for search dropdown display
  // Remove country if it's obvious (UK, US, etc.)
  let result = abbreviated
    .replace(/, United Kingdom$/, ', UK')
    .replace(/, United States$/, ', US')
    .replace(/, Australia$/, ', AU');
  
  // For very long addresses, take only the most relevant parts
  const parts = result.split(', ');
  if (parts.length > 3) {
    // Keep first part (city/area) and last part (country/state)
    result = `${parts[0]}, ${parts[parts.length - 1]}`;
  }
  
  return result;
};

export function EnhancedSearchBar({ 
  placeholder = "Search by location, postcode, or username...",
  className = "",
  showRadius = true,
  onSearch
}: EnhancedSearchBarProps) {
  console.log('🚀 EnhancedSearchBar component rendered');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [radius, setRadius] = useState(25);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    coordinates?: { lat: number; lng: number };
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get user's current location for distance calculations
  React.useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        console.log('🌍 User location obtained:', location);
      } catch (error) {
        console.warn('Could not get user location for distance sorting:', error);
      }
    };

    getUserLocation();
  }, []);


  // Detect search type - location or user
  const detectSearchType = (input: string): 'location' | 'user' => {
    const lowerInput = input.toLowerCase().trim();
    
    // UK Postcode patterns
    const postcodePatterns = [
      /^[a-z]{1,2}\d{1,2}\s*\d[a-z]{2}$/i, // UK postcode (e.g., SW1A 1AA, M1 1AA)
      /^[a-z]{1,2}\d[a-z]\s*\d[a-z]{2}$/i, // UK postcode with letter (e.g., W1A 0AX)
    ];
    
    // US ZIP code patterns
    const zipPatterns = [
      /^\d{5}$/i, // 5-digit ZIP
      /^\d{5}-\d{4}$/i, // ZIP+4
    ];
    
    // Check if it's a postcode/ZIP first
    if (postcodePatterns.some(pattern => pattern.test(lowerInput)) || 
        zipPatterns.some(pattern => pattern.test(lowerInput))) {
      return 'location';
    }
    
    // If it's a short alphanumeric string without spaces, likely a username
    if (/^[a-z0-9_-]{3,20}$/i.test(lowerInput) && !lowerInput.includes(' ')) {
      return 'user';
    }
    
    // Everything else is treated as a location (city, area, etc.)
    return 'location';
  };

  // Fetch suggestions from multiple sources
  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    try {
      console.log('🔎 fetchSuggestions called with:', searchQuery);
      const type = detectSearchType(searchQuery);
      console.log('🎯 Detected search type:', type);
      
      let allSuggestions: SearchSuggestion[] = [];

      // Search for users only if it looks like a username search
      if (type === 'user' || searchQuery.length >= 3) {
        try {
          console.log('🔍 Searching for users...');
          const userSuggestions = await fetchUserSuggestions(searchQuery);
          console.log('👥 Found user suggestions:', userSuggestions.length);
          allSuggestions = [...allSuggestions, ...userSuggestions];
        } catch (error) {
          console.warn('User search error:', error);
        }
      }

      // Always try Google Places for location suggestions
      if (window.google?.maps?.places) {
        setIsLoadingPlaces(true);
        try {
          console.log('🗺️ Searching Google Places...');
          const placeSuggestions = await fetchGooglePlaces(searchQuery);
          console.log('📍 Found place suggestions:', placeSuggestions.length);
          allSuggestions = [...allSuggestions, ...placeSuggestions];
        } catch (error) {
          console.warn('Google Places error:', error);
        } finally {
          setIsLoadingPlaces(false);
        }
      }

      // Deduplicate suggestions
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );

      console.log('📋 All suggestions before sorting:', uniqueSuggestions);
      console.log('🌍 User location for distance calculation:', userLocation);

      // Sort by relevance and distance
      uniqueSuggestions.sort((a, b) => {
        // Prioritize exact matches first
        const aExact = a.text.toLowerCase().startsWith(searchQuery.toLowerCase());
        const bExact = b.text.toLowerCase().startsWith(searchQuery.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize users over locations
        if (a.type === 'user' && b.type !== 'user') return -1;
        if (a.type !== 'user' && b.type === 'user') return 1;
        
        // For items of the same type, sort by distance if available
        if (a.type === b.type) {
          // If both have distance, sort by distance (closest first)
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          // If only one has distance, prioritize it
          if (a.distance !== undefined && b.distance === undefined) return -1;
          if (a.distance === undefined && b.distance !== undefined) return 1;
        }
        
        // Fallback to alphabetical sorting
        return a.text.localeCompare(b.text);
      });

      const finalSuggestions = uniqueSuggestions.slice(0, 8);
      console.log('✅ Final suggestions to display:', finalSuggestions);
      console.log('🔓 Setting isOpen to:', finalSuggestions.length > 0);
      
      setSuggestions(finalSuggestions);
      setIsOpen(finalSuggestions.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  // Fetch Google Places suggestions with coordinates for distance calculation
  const fetchGooglePlaces = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    if (!window.google?.maps?.places) {
      return [];
    }

    const autocompleteService = new window.google.maps.places.AutocompleteService();
    const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));

    // Define different search types to try - enhanced for landmarks and businesses
    const searchTypes = [
      ['(cities)'], // Cities, towns, neighborhoods
      ['postal_code'], // Postcodes/zip codes
      ['sublocality'], // Neighborhoods, districts
      ['locality'], // Cities and towns
      ['establishment'], // Businesses, landmarks, points of interest
      ['tourist_attraction'], // Tourist attractions, landmarks
      ['natural_feature'], // Parks, forests, mountains
      ['park'], // Parks and recreational areas
    ];

    // Make parallel requests for different types
    const promises = searchTypes.map((types) => {
      return new Promise<SearchSuggestion[]>((resolve) => {
        autocompleteService.getPlacePredictions(
          {
            input: searchQuery,
            types: types,
            // Remove country restrictions for landmarks and tourist attractions to allow global search
            ...(types.includes('establishment') || types.includes('tourist_attraction') || types.includes('natural_feature') || types.includes('park') 
              ? {} 
              : { componentRestrictions: { country: ['us', 'gb', 'ca', 'au'] } })
          },
          async (predictions: any[], status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              // Get details for each prediction to obtain coordinates
              const detailPromises = predictions.slice(0, 3).map((prediction) => {
                return new Promise<SearchSuggestion | null>((detailResolve) => {
                  placesService.getDetails(
                    {
                      placeId: prediction.place_id,
                      fields: ['place_id', 'formatted_address', 'geometry', 'name']
                    },
                    (place: any, detailStatus: any) => {
                      if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                        let distance: number | undefined;
                        
                        // Calculate distance if user location is available
                        if (userLocation && place.geometry?.location) {
                          const lat = typeof place.geometry.location.lat === 'function' 
                            ? place.geometry.location.lat() 
                            : place.geometry.location.lat;
                          const lng = typeof place.geometry.location.lng === 'function' 
                            ? place.geometry.location.lng() 
                            : place.geometry.location.lng;
                          
                          distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            lat,
                            lng
                          );
                        }

                        // Format location suggestion based on whether it's a business/establishment or just a location
                        let displayText = '';
                        let locationText = '';
                        
                        console.log('🏢 Place details:', { 
                          name: place.name, 
                          formatted_address: place.formatted_address,
                          types: place.types 
                        });
                        
                        const fullAddress = place.formatted_address || place.name || prediction.description;
                        
                        // Always use the full formatted address as the display text
                        displayText = fullAddress;
                        locationText = ''; // Don't use location text since we're showing everything in main text
                        console.log('📍 Location suggestion:', displayText);

                        detailResolve({
                          id: `place-${place.place_id}`,
                          text: displayText, // Abbreviated for dropdown display
                          location: locationText,
                          type: 'location' as const,
                          distance: distance || 0,
                          metadata: {
                            place_id: place.place_id,
                            full_address: fullAddress, // Store full address for input box
                            ...(place.geometry?.location ? {
                              coordinates: {
                                lat: typeof place.geometry.location.lat === 'function' 
                                  ? place.geometry.location.lat() 
                                  : place.geometry.location.lat,
                                lng: typeof place.geometry.location.lng === 'function' 
                                  ? place.geometry.location.lng() 
                                  : place.geometry.location.lng
                              }
                            } : {})
                          }
                        });
                      } else {
                        detailResolve(null);
                      }
                    }
                  );
                });
              });

              try {
                const detailResults = await Promise.all(detailPromises);
                const validResults = detailResults.filter((result): result is SearchSuggestion => result !== null);
                resolve(validResults);
              } catch (error) {
                console.warn('Error getting place details:', error);
                resolve([]);
              }
            } else {
              resolve([]);
            }
          }
        );
      });
    });

    try {
      const results = await Promise.all(promises);
      // Flatten and deduplicate results
      const flatResults = results.flat();
      const uniqueResults = flatResults.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );
      
      return uniqueResults.slice(0, 5); // Limit to 5 total suggestions
    } catch (error) {
      console.warn('Error fetching Google Places suggestions:', error);
      return [];
    }
  };

  // Fetch user suggestions by username
  const fetchUserSuggestions = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    try {
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return (data.users || []).map((user: any) => {
        // Calculate distance if user location is available
        let distance: number | undefined;
        if (userLocation && user.coordinates) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            user.coordinates.lat,
            user.coordinates.lng
          );
        }

        return {
          id: `user-${user.id}`,
          text: formatUserSuggestion(user.username, user.display_name),
          location: user.location || '', // Full location
          type: 'user' as const,
          distance,
          metadata: {
            user_id: user.id,
            coordinates: user.coordinates,
            full_location: user.full_location || user.location // Store for geocoding if needed
          }
        };
      });
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      return [];
    }
  };

  // Note: Removed duplicate debounced search useEffect to avoid conflicts
  // The onChange handler now handles all debouncing and processing

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'location') {
      // For locations, use the full address (now stored in suggestion.text)
      const fullAddress = suggestion.metadata?.full_address || suggestion.text;
      setSelectedLocation({
        name: fullAddress,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      });
      setQuery(fullAddress); // Put full address in input box
      // Don't perform search immediately - wait for Enter key or search button click
    } else if (suggestion.type === 'user') {
      // For users, use their actual location address from metadata, not the formatted text
      const actualLocation = suggestion.metadata?.full_location || suggestion.text;
      setSelectedLocation({
        name: actualLocation,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      });
      setQuery(suggestion.text); // Keep the formatted username in the search box for display
      // Don't perform search immediately - wait for Enter key or search button click
    }
    
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle search submission
  const handleSearch = () => {
    if (query.trim()) {
      if (selectedLocation) {
        // Use the selected location (which is the actual address for users)
        performLocationSearch(selectedLocation.name, selectedLocation.coordinates);
      } else {
        // Try to geocode the query
        performLocationSearch(query);
      }
    }
  };

  // Perform location-based search
  const performLocationSearch = async (locationName: string, coordinates?: { lat: number; lng: number }) => {
    const params = new URLSearchParams();
    
    // Set location parameter
    params.set('location', locationName);
    
    // Set radius if enabled
    if (showRadius && radius > 0) {
      params.set('radius', radius.toString());
    }
    
    // If we have coordinates, add them
    if (coordinates) {
      params.set('lat', coordinates.lat.toString());
      params.set('lng', coordinates.lng.toString());
    } else if (window.google?.maps?.places) {
      // Try to geocode the location to get coordinates
      try {
        const geocodedCoords = await geocodeLocation(locationName);
        if (geocodedCoords) {
          params.set('lat', geocodedCoords.lat.toString());
          params.set('lng', geocodedCoords.lng.toString());
        }
      } catch (error) {
        console.warn('Geocoding failed:', error);
      }
    }

    // Call custom handler if provided
    if (onSearch) {
      onSearch(locationName, coordinates, showRadius ? radius : undefined);
    }

    console.log('Location search:', { locationName, coordinates, params: params.toString() });

    // Navigate to studios page
    router.push(`/studios?${params.toString()}`);
    setIsOpen(false);
  };

  // Geocode a location to get coordinates
  const geocodeLocation = (locationName: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!window.google?.maps) {
        resolve(null);
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: locationName }, (results: any[], status: any) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'location':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'user':
        return <Building className="w-4 h-4 text-green-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-500" />;
    }
  };


  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="bg-white rounded-xl p-2 shadow-2xl">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: colors.textSubtle }} />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className="w-full h-10 pl-8 pr-3 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ 
                  color: colors.textPrimary, 
                  '--tw-ring-color': colors.primary 
                } as React.CSSProperties}
                value={query}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log('⌨️ Input onChange triggered with:', newValue);
                  setQuery(newValue);
                  
                  // Clear selected location if user is typing something new
                  if (selectedLocation && newValue !== selectedLocation.name) {
                    setSelectedLocation(null);
                  }
                  
                  // Trigger suggestions with debounce
                  if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                  }
                  
                  debounceRef.current = setTimeout(() => {
                    fetchSuggestions(newValue);
                  }, 300);
                }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              
            </div>
          </div>
          
          {/* Search Button */}
          <button
            className="h-10 px-4 font-semibold rounded-lg transition-all duration-300 hover:shadow-lg"
            style={{ backgroundColor: colors.primary, color: colors.background }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[60] w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto">
          {isLoadingPlaces && (
            <div className="px-4 py-2 text-sm text-gray-500 border-b">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                Loading location suggestions...
              </div>
            </div>
          )}
          
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              ref={(el) => { suggestionRefs.current[index] = el; }}
              className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-900'
              }`}
              onClick={() => handleSelect(suggestion)}
            >
              {getSuggestionIcon(suggestion.type)}
              <div className="flex-1">
                <div className="font-medium text-black">
                  {suggestion.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Radius Slider - Moved Below Search Bar */}
      {showRadius && (
        <div className="mt-6 p-4 bg-transparent">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white">
              Search Radius: <span className="font-bold">{radius} miles</span>
            </label>
            <span></span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(radius - 1) / 49 * 100}%, rgba(255, 255, 255, 0.3) ${(radius - 1) / 49 * 100}%, rgba(255, 255, 255, 0.3) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-white opacity-70 mt-1">
            <span>1mi</span>
            <span>25mi</span>
            <span>50mi</span>
          </div>
        </div>
      )}

    </div>
  );
}

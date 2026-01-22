'use client';
import { logger } from '@/lib/logger';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building } from 'lucide-react';
import { colors } from '../home/HomePage';
import { formatUserSuggestion, calculateDistance } from '@/lib/utils/address';

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


export function EnhancedSearchBar({ 
  placeholder = "Search by location, postcode, or username...",
  className = "",
  showRadius = true,
  onSearch
}: EnhancedSearchBarProps) {
  logger.log('🚀 EnhancedSearchBar component rendered');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [radius, setRadius] = useState(10);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    coordinates?: { lat: number; lng: number };
  } | null>(null);
  // User location for distance calculations - currently disabled (always null)
  // since auto-search on autocomplete selection is disabled
  // Kept for future use if we want to re-enable location-based sorting
  const userLocation = null as { lat: number; lng: number } | null;
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const radiusDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (radiusDebounceRef.current) {
        clearTimeout(radiusDebounceRef.current);
      }
    };
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
      logger.log('🔎 fetchSuggestions called with:', searchQuery);
      const type = detectSearchType(searchQuery);
      logger.log('🎯 Detected search type:', type);
      
      let allSuggestions: SearchSuggestion[] = [];

      // Search for users only if it looks like a username search
      if (type === 'user' || searchQuery.length >= 3) {
        try {
          logger.log('🔍 Searching for users...');
          const userSuggestions = await fetchUserSuggestions(searchQuery);
          logger.log('👥 Found user suggestions:', userSuggestions.length);
          allSuggestions = [...allSuggestions, ...userSuggestions];
        } catch (error) {
          logger.warn('User search error:', error);
        }
      }

      // Always try Google Places for location suggestions
      if (window.google?.maps?.places) {
        setIsLoadingPlaces(true);
        try {
          logger.log('🗺️ Searching Google Places...');
          const placeSuggestions = await fetchGooglePlaces(searchQuery);
          logger.log('📍 Found place suggestions:', placeSuggestions.length);
          allSuggestions = [...allSuggestions, ...placeSuggestions];
        } catch (error) {
          logger.warn('Google Places error:', error);
        } finally {
          setIsLoadingPlaces(false);
        }
      }

      // Deduplicate suggestions
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );

      logger.log('📋 All suggestions before sorting:', uniqueSuggestions);
      logger.log('🌍 User location for distance calculation:', userLocation);

      // Sort by relevance and distance
      uniqueSuggestions.sort((a, b) => {
        // FIRST: Prioritize locations over users (blue pins before green pins)
        if (a.type === 'location' && b.type === 'user') return -1;
        if (a.type === 'user' && b.type === 'location') return 1;
        
        // SECOND: Within same type, prioritize exact matches
        if (a.type === b.type) {
          const aExact = a.text.toLowerCase().startsWith(searchQuery.toLowerCase());
          const bExact = b.text.toLowerCase().startsWith(searchQuery.toLowerCase());
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // THIRD: For items of same type and same exact-match status, sort by distance
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          // If only one has distance, prioritize it
          if (a.distance !== undefined && b.distance === undefined) return -1;
          if (a.distance === undefined && b.distance !== undefined) return 1;
          
          // Fallback to alphabetical sorting
          return a.text.localeCompare(b.text);
        }
        
        return 0;
      });

      const finalSuggestions = uniqueSuggestions.slice(0, 8);
      logger.log('✅ Final suggestions to display:', finalSuggestions);
      logger.log('🔓 Setting isOpen to:', finalSuggestions.length > 0);
      
      setSuggestions(finalSuggestions);
      setIsOpen(finalSuggestions.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      logger.error('Failed to fetch suggestions:', error);
    }
  };

  // Fetch Google Places suggestions with coordinates for distance calculation
  const fetchGooglePlaces = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    if (!window.google?.maps?.places) {
      return [];
    }

    const places = window.google.maps.places as any;
    const autocompleteService = new places.AutocompleteService();
    const placesService = new places.PlacesService(document.createElement('div'));

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
        const requestOptions: any = {
          input: searchQuery,
          types: types,
        };

        // If user location is available, bias results towards user's location
        if (userLocation) {
          requestOptions.location = new (window.google.maps as any).LatLng(userLocation.lat, userLocation.lng);
          requestOptions.radius = 50000; // 50km radius bias around user's location
        }

        // Add country restrictions to keep results relevant (but not UK-biased)
        if (!types.includes('establishment') && !types.includes('tourist_attraction') && 
            !types.includes('natural_feature') && !types.includes('park')) {
          requestOptions.componentRestrictions = { country: ['us', 'gb', 'ca', 'au', 'ie', 'nz'] };
        }

        autocompleteService.getPlacePredictions(
          requestOptions,
          async (predictions: any[], status: any) => {
            if (status === places.PlacesServiceStatus.OK && predictions) {
              // Get details for each prediction to obtain coordinates
              const detailPromises = predictions.slice(0, 3).map((prediction) => {
                return new Promise<SearchSuggestion | null>((detailResolve) => {
                  placesService.getDetails(
                    {
                      placeId: prediction.place_id,
                      fields: ['place_id', 'formatted_address', 'geometry', 'name']
                    },
                    (place: any, detailStatus: any) => {
                      if (detailStatus === places.PlacesServiceStatus.OK && place) {
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
                        
                        logger.log('🏢 Place details:', { 
                          name: place.name, 
                          formatted_address: place.formatted_address,
                          types: place.types 
                        });
                        
                        const fullAddress = place.formatted_address || place.name || prediction.description;
                        
                        // For establishments/landmarks, show the name prominently
                        // Check if this is a business/landmark (has a distinct name different from address)
                        const isEstablishment = place.name && 
                                               place.formatted_address && 
                                               !place.formatted_address.startsWith(place.name);
                        
                        if (isEstablishment) {
                          // Show name first, then abbreviated address
                          displayText = `${place.name} - ${place.formatted_address}`;
                        } else {
                          // For regular locations (cities, areas), show the full address
                          displayText = fullAddress;
                        }
                        
                        locationText = ''; // Don't use location text since we're showing everything in main text
                        logger.log('📍 Location suggestion:', displayText);

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
                logger.warn('Error getting place details:', error);
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
      logger.warn('Error fetching Google Places suggestions:', error);
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
      logger.error('Error fetching user suggestions:', error);
      return [];
    }
  };

  // Note: Removed duplicate debounced search useEffect to avoid conflicts
  // The onChange handler now handles all debouncing and processing

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0 && selectedIndex >= 0 && suggestions[selectedIndex]) {
        // If dropdown is open and a suggestion is selected, select it (but don't auto-search)
        handleSelect(suggestions[selectedIndex]);
      } else {
        // Otherwise, perform search with current typed query (even if no autocomplete selected)
        const typedQuery = query.trim();
        if (typedQuery) {
          performLocationSearch(typedQuery);
        }
      }
      return;
    }

    if (!isOpen || suggestions.length === 0) {
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
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: SearchSuggestion) => {
    let locationToSearch: { name: string; coordinates?: { lat: number; lng: number } } | null = null;
    
    if (suggestion.type === 'location') {
      // For locations, use the full address (now stored in suggestion.text)
      const fullAddress = suggestion.metadata?.full_address || suggestion.text;
      locationToSearch = {
        name: fullAddress,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      };
      setSelectedLocation(locationToSearch);
      setQuery(fullAddress); // Put full address in input box
    } else if (suggestion.type === 'user') {
      // For users, use their actual location address from metadata, not the formatted text
      const actualLocation = suggestion.metadata?.full_location || suggestion.text;
      locationToSearch = {
        name: actualLocation,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      };
      setSelectedLocation(locationToSearch);
      setQuery(suggestion.text); // Keep the formatted username in the search box for display
    }
    
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Auto-search disabled - user must click search button or press Enter
    // Removed auto-search on autocomplete selection per client request
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
        logger.warn('Geocoding failed:', error);
      }
    }

    // Call custom handler if provided
    if (onSearch) {
      onSearch(locationName, coordinates, showRadius ? radius : undefined);
    }

    logger.log('Location search:', { locationName, coordinates, params: params.toString() });

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

      const geocoder = new (window.google.maps as any).Geocoder();
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

  // Helper function to detect if device is mobile
  const isMobileDevice = () => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  };


  return (
    <div className={`${className} w-full max-w-full`}>
      <div className="relative">
        {/* Main Search Input */}
        <div className="bg-white rounded-xl p-2 sm:p-2 shadow-2xl w-full max-w-full">
          <div className="flex gap-2 sm:gap-3 w-full max-w-full">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: colors.textSubtle }} />
                <input
                  ref={inputRef}
                type="text"
                placeholder={placeholder}
                className="w-full h-10 pl-8 pr-2 sm:pr-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                style={{ 
                  color: colors.textPrimary,
                  fontSize: '16px', // Minimum 16px to prevent iOS zoom
                  maxWidth: '100%',
                  touchAction: 'manipulation'
                } as React.CSSProperties}
                value={query}
                suppressHydrationWarning
                onChange={(e) => {
                  const newValue = e.target.value;
                  logger.log('⌨️ Input onChange triggered with:', newValue);
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
            type="button"
            className="h-10 px-3 sm:px-4 font-semibold rounded-lg transition-all duration-300 hover:shadow-lg flex-shrink-0 whitespace-nowrap"
            style={{ 
              backgroundColor: colors.primary, 
              color: colors.background,
              fontSize: '16px', // Match input font-size for consistency
              minWidth: 'fit-content'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            onClick={(e) => {
              e.preventDefault();
              // Use typed query directly to avoid async state issues
              const typedQuery = query.trim();
              if (typedQuery) {
                performLocationSearch(typedQuery);
              }
            }}
          >
            Search
          </button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div 
            ref={dropdownRef}
            className="absolute z-[9999] w-full bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-80 overflow-auto mt-2"
            style={{
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
          >
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
              onClick={() => {
                handleSelect(suggestion);
              }}
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
      </div>

      {/* Radius Slider - Moved Below Search Bar */}
      {showRadius && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-transparent">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-medium text-white">
              Search Radius: <span className="font-bold">{radius} miles</span>
            </label>
            <span></span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={(() => {
              // Convert radius to slider position (0-100)
              if (radius <= 5) return ((radius - 1) / 4) * 25; // 1-5 maps to 0-25%
              if (radius <= 10) return 25 + ((radius - 5) / 5) * 25; // 5-10 maps to 25-50%
              if (radius <= 25) return 50 + ((radius - 10) / 15) * 25; // 10-25 maps to 50-75%
              return 75 + ((radius - 25) / 25) * 25; // 25-50 maps to 75-100%
            })()}
            onChange={(e) => {
              const sliderValue = parseInt(e.target.value);
              let newRadius;
              
              // Convert slider position (0-100) to radius
              if (sliderValue <= 25) {
                newRadius = Math.round(1 + (sliderValue / 25) * 4); // 0-25% maps to 1-5
              } else if (sliderValue <= 50) {
                newRadius = Math.round(5 + ((sliderValue - 25) / 25) * 5); // 25-50% maps to 5-10
              } else if (sliderValue <= 75) {
                newRadius = Math.round(10 + ((sliderValue - 50) / 25) * 15); // 50-75% maps to 10-25
              } else {
                newRadius = Math.round(25 + ((sliderValue - 75) / 25) * 25); // 75-100% maps to 25-50
              }
              
              // Update radius immediately for UI feedback
              setRadius(newRadius);
              
              // Debounce the search: 1s on mobile, 500ms on desktop
              if (radiusDebounceRef.current) {
                clearTimeout(radiusDebounceRef.current);
              }
              
              const delay = isMobileDevice() ? 1000 : 500;
              radiusDebounceRef.current = setTimeout(() => {
                logger.log(`Radius search triggered after ${delay}ms delay: ${newRadius} miles`);
                // The search will be triggered when the user clicks the Search button
                // No need to trigger here since radius is used in handleSearch
              }, delay);
            }}
            className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider touch-none"
            style={{
              background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(() => {
                // Convert radius to percentage for visual progress bar
                if (radius <= 5) return ((radius - 1) / 4) * 25;
                if (radius <= 10) return 25 + ((radius - 5) / 5) * 25;
                if (radius <= 25) return 50 + ((radius - 10) / 15) * 25;
                return 75 + ((radius - 25) / 25) * 25;
              })()}%, rgba(255, 255, 255, 0.3) ${(() => {
                if (radius <= 5) return ((radius - 1) / 4) * 25;
                if (radius <= 10) return 25 + ((radius - 5) / 5) * 25;
                if (radius <= 25) return 50 + ((radius - 10) / 15) * 25;
                return 75 + ((radius - 25) / 25) * 25;
              })()}%, rgba(255, 255, 255, 0.3) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-white opacity-70 mt-1 px-1">
            <span>1mi</span>
            <span>5mi</span>
            <span>10mi</span>
            <span>25mi</span>
            <span>50mi</span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { logger } from '@/lib/logger';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building, Mic } from 'lucide-react';
import { colors } from '../home/HomePage';
import { formatUserSuggestion, calculateDistance } from '@/lib/utils/address';
import { formatPlaceLabel, sortSuggestions } from '@/lib/search';
import { useUserLocation } from '@/lib/location';

interface SearchSuggestion {
  id: string;
  text: string;
  location?: string;
  type: 'location' | 'user' | 'studio';
  distance?: number; // Distance in km from user's location
  metadata?: {
    place_id?: string;
    user_id?: string;
    username?: string; // Username for building profile URL
    studio_id?: string;
    studio_username?: string; // Username for studio profile URL
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

  // Shared user-location hook (IP-geo fallback + browser geolocation)
  const { userLocation, requestPreciseLocation } = useUserLocation();
  
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

      // Fetch studio-name suggestions (home-only feature)
      if (searchQuery.length >= 2) {
        try {
          logger.log('🏢 Searching for studio profiles...');
          const studioSuggestions = await fetchStudioSuggestions(searchQuery);
          logger.log('🏢 Found studio suggestions:', studioSuggestions.length);
          allSuggestions = [...allSuggestions, ...studioSuggestions];
        } catch (error) {
          logger.warn('Studio search error:', error);
        }
      }

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

      // Sort using shared logic with studio boosting (home-only)
      const sorted = sortSuggestions(uniqueSuggestions, searchQuery, { boostStudios: true });

      const finalSuggestions = sorted.slice(0, 8);
      logger.log('✅ Final suggestions to display:', finalSuggestions);
      
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

    // Same search types as /studios for consistent results
    const searchTypes = [
      ['(cities)'],
      ['postal_code'],
      ['sublocality'],
      ['locality'],
      ['establishment'],
      ['tourist_attraction'],
      ['natural_feature'],
      ['park'],
    ];

    const promises = searchTypes.map((types) => {
      return new Promise<SearchSuggestion[]>((resolve) => {
        const requestOptions: any = {
          input: searchQuery,
          types: types,
        };

        // Bias results towards user's location if available
        if (userLocation) {
          requestOptions.location = new (window.google.maps as any).LatLng(userLocation.lat, userLocation.lng);
          requestOptions.radius = 50000; // 50km radius bias
        }

        // Country restrictions for non-establishments (same as /studios)
        if (!types.includes('establishment') && !types.includes('tourist_attraction') && 
            !types.includes('natural_feature') && !types.includes('park')) {
          requestOptions.componentRestrictions = { country: ['us', 'gb', 'ca', 'au', 'ie', 'nz'] };
        }

        autocompleteService.getPlacePredictions(
          requestOptions,
          async (predictions: any[], status: any) => {
            if (status === places.PlacesServiceStatus.OK && predictions) {
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

                        // Use shared label formatting — consistent with /studios
                        const displayText = formatPlaceLabel({
                          name: place.name,
                          formatted_address: place.formatted_address,
                          description: prediction.description,
                        });

                        const fullAddress = place.formatted_address || place.name || prediction.description;

                        detailResolve({
                          id: `place-${place.place_id}`,
                          text: displayText,
                          location: '',
                          type: 'location' as const,
                          distance: distance || 0,
                          metadata: {
                            place_id: place.place_id,
                            full_address: fullAddress,
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
      const flatResults = results.flat();
      const uniqueResults = flatResults.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );
      
      return uniqueResults.slice(0, 5);
    } catch (error) {
      logger.warn('Error fetching Google Places suggestions:', error);
      return [];
    }
  };

  // Fetch studio-name suggestions (home page only)
  const fetchStudioSuggestions = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    try {
      const response = await fetch(`/api/search/studios?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return (data.studios || []).map((studio: any) => ({
        id: `studio-${studio.id}`,
        text: studio.name,
        location: studio.city || '',
        type: 'studio' as const,
        metadata: {
          studio_id: studio.id,
          studio_username: studio.username,
        }
      }));
    } catch (error) {
      logger.error('Error fetching studio suggestions:', error);
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
          location: user.location || '',
          type: 'user' as const,
          distance,
          metadata: {
            user_id: user.id,
            username: user.username,
            coordinates: user.coordinates,
            full_location: user.full_location || user.location
          }
        };
      });
    } catch (error) {
      logger.error('Error fetching user suggestions:', error);
      return [];
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0 && selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else {
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
    if (suggestion.type === 'user') {
      const username = suggestion.metadata?.username;
      if (username) {
        window.open(`/${username}`, '_blank');
      }
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    if (suggestion.type === 'studio') {
      // Open studio profile page
      const username = suggestion.metadata?.studio_username;
      if (username) {
        window.open(`/${username}`, '_blank');
      }
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }
    
    // Location suggestions
    let locationToSearch: { name: string; coordinates?: { lat: number; lng: number } } | null = null;
    
    if (suggestion.type === 'location') {
      const fullAddress = suggestion.metadata?.full_address || suggestion.text;
      locationToSearch = {
        name: fullAddress,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      };
      setSelectedLocation(locationToSearch);
      setQuery(fullAddress);
    }
    
    setIsOpen(false);
    setSelectedIndex(-1);
  };


  // Perform location-based search
  const performLocationSearch = async (locationName: string, coordinates?: { lat: number; lng: number }) => {
    const params = new URLSearchParams();
    
    params.set('location', locationName);
    
    if (showRadius && radius > 0) {
      params.set('radius', radius.toString());
    }
    
    if (coordinates) {
      params.set('lat', coordinates.lat.toString());
      params.set('lng', coordinates.lng.toString());
    } else if (window.google?.maps?.places) {
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

    if (onSearch) {
      onSearch(locationName, coordinates, showRadius ? radius : undefined);
    }

    logger.log('Location search:', { locationName, coordinates, params: params.toString() });

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
      case 'studio':
        return <Mic className="w-4 h-4 text-red-500" />;
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
                  fontSize: '16px',
                  maxWidth: '100%',
                  touchAction: 'manipulation'
                } as React.CSSProperties}
                value={query}
                suppressHydrationWarning
                onChange={(e) => {
                  const newValue = e.target.value;
                  logger.log('⌨️ Input onChange triggered with:', newValue);
                  setQuery(newValue);
                  
                  if (selectedLocation && newValue !== selectedLocation.name) {
                    setSelectedLocation(null);
                  }
                  
                  if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                  }
                  
                  debounceRef.current = setTimeout(() => {
                    fetchSuggestions(newValue);
                  }, 200);
                }}
                onFocus={() => {
                  // On first interaction with the search box, request precise location
                  requestPreciseLocation();
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
              fontSize: '16px',
              minWidth: 'fit-content'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            onClick={(e) => {
              e.preventDefault();
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
            className="absolute z-[9999] w-full bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-[30rem] overflow-auto mt-2"
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
                {suggestion.type === 'studio' && suggestion.location && (
                  <div className="text-xs text-gray-500">{suggestion.location}</div>
                )}
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
              
              setRadius(newRadius);
              
              if (radiusDebounceRef.current) {
                clearTimeout(radiusDebounceRef.current);
              }
              
              const delay = isMobileDevice() ? 1000 : 500;
              radiusDebounceRef.current = setTimeout(() => {
                logger.log(`Radius search triggered after ${delay}ms delay: ${newRadius} miles`);
              }, delay);
            }}
            className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider touch-none"
            style={{
              background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(() => {
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

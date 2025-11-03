'use client';

import React, { useState, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
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
  };
}

interface EnhancedLocationFilterProps {
  value: string;
  onChange: (value: string, placeDetails?: any) => void;
  onEnterKey?: () => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedLocationFilter({ 
  value,
  onChange,
  onEnterKey,
  placeholder = "Search by location, postcode, or username...",
  className = ""
}: EnhancedLocationFilterProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get user's current location for distance calculations
  React.useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        console.log('🌍 User location obtained for filters:', location);
      } catch (error) {
        console.warn('Could not get user location for distance sorting:', error);
      }
    };

    getUserLocation();
  }, []);

  // Update internal query when value prop changes
  React.useEffect(() => {
    // If the value looks like a full address (contains commas and is long), abbreviate it for display
    if (value && value.includes(',') && value.length > 30) {
      setQuery(abbreviateAddress(value));
    } else {
      setQuery(value);
    }
  }, [value]);

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

      // If no Google Places suggestions and it looks like a location search, add a fallback
      const hasLocationSuggestions = allSuggestions.some(s => s.type === 'location');
      if (!hasLocationSuggestions && type === 'location' && searchQuery.length >= 3) {
        console.log('🔄 Adding fallback location suggestion for:', searchQuery);
        allSuggestions.push({
          id: `fallback-${searchQuery}`,
          text: searchQuery,
          type: 'location' as const,
          metadata: {}
        });
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
      console.warn('🚫 Google Maps Places API not available');
      return [];
    }
    
    console.log('🗺️ Google Places API available, fetching suggestions for:', searchQuery);

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
                        
                        console.log('🏢 Place details:', { 
                          name: place.name, 
                          formatted_address: place.formatted_address,
                          types: place.types 
                        });
                        
                        if (place.name && place.formatted_address && place.name !== place.formatted_address) {
                          // It's a business/establishment - show "Business Name - Address"
                          displayText = place.name;
                          locationText = place.formatted_address;
                          console.log('✅ Business/establishment detected:', displayText, '-', locationText);
                        } else {
                          // It's just a location - show address only
                          displayText = place.formatted_address || place.name || prediction.description;
                          console.log('📍 General location detected:', displayText);
                        }

                        detailResolve({
                          id: `place-${place.place_id}`,
                          text: displayText,
                          location: locationText, // This will show in grey text for businesses
                          type: 'location' as const,
                          distance: distance || 0,
                          metadata: {
                            place_id: place.place_id,
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
          location: user.location, // Abbreviated location will show in grey text
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

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce the suggestion fetching
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && onEnterKey) {
        e.preventDefault();
        onEnterKey();
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
        } else if (onEnterKey) {
          onEnterKey();
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
    console.log('🎯 Suggestion selected:', suggestion);
    
    if (suggestion.type === 'location') {
      setQuery(suggestion.text);
      // For location suggestions, pass the place details if available
      const placeDetails = suggestion.metadata?.coordinates ? {
        geometry: {
          location: {
            lat: () => suggestion.metadata?.coordinates?.lat || 0,
            lng: () => suggestion.metadata?.coordinates?.lng || 0
          }
        },
        formatted_address: suggestion.location || suggestion.text,
        place_id: suggestion.metadata?.place_id
      } : undefined;
      
      console.log('📍 Location selected, calling onChange with:', suggestion.text, placeDetails);
      onChange(suggestion.text, placeDetails);
    } else if (suggestion.type === 'user') {
      // For users, use their actual location address from metadata
      const actualLocation = suggestion.metadata?.full_location || suggestion.text;
      setQuery(actualLocation);
      
      const placeDetails = suggestion.metadata?.coordinates ? {
        geometry: {
          location: {
            lat: () => suggestion.metadata?.coordinates?.lat || 0,
            lng: () => suggestion.metadata?.coordinates?.lng || 0
          }
        },
        formatted_address: actualLocation
      } : undefined;
      
      console.log('👤 User selected, calling onChange with:', actualLocation, placeDetails);
      onChange(actualLocation, placeDetails);
    }
    
    setIsOpen(false);
    setSelectedIndex(-1);
  };


  // Handle clicks outside to close suggestions
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideInput = inputRef.current && inputRef.current.contains(target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      
      console.log('🖱️ Click outside check:', {
        clickedInsideInput,
        clickedInsideDropdown,
        willClose: !clickedInsideInput && !clickedInsideDropdown
      });
      
      if (!clickedInsideInput && !clickedInsideDropdown) {
        console.log('🚪 Closing dropdown due to outside click');
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mouseup', handleClickOutside);
    return () => {
      document.removeEventListener('mouseup', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${className}`}
        autoComplete="off"
      />
      
      {/* Search Button */}
      <button
        type="button"
        onClick={() => {
          if (onEnterKey) {
            onEnterKey();
          }
        }}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white rounded-md p-1.5 transition-colors"
        style={{ 
          backgroundColor: colors.primary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.primaryHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.primary;
        }}
        aria-label="Search"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoadingPlaces && (
            <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-500"></div>
              Loading places...
            </div>
          )}
          
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              ref={(el) => { suggestionRefs.current[index] = el; }}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-900'
              }`}
              onMouseDown={(e) => {
                console.log('🖱️ Suggestion mouse down:', suggestion.text);
                e.preventDefault();
                e.stopPropagation();
                handleSelect(suggestion);
              }}
              onClick={(e) => {
                console.log('🖱️ Suggestion clicked:', suggestion.text);
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="text-xs font-medium text-gray-900">
                {suggestion.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

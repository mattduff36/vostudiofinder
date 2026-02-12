'use client';
import { logger } from '@/lib/logger';

import React, { useState, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { colors } from '../home/HomePage';
import { calculateDistance } from '@/lib/utils/address';
import { formatPlaceLabel, sortSuggestions } from '@/lib/search';

interface SearchSuggestion {
  id: string;
  text: string;
  location?: string;
  type: 'location';
  distance?: number; // Distance in km from user's location
  metadata?: {
    place_id?: string;
    coordinates?: { lat: number; lng: number };
  };
}

interface EnhancedLocationFilterProps {
  value: string;
  onChange: (value: string, placeDetails?: any) => void;
  onEnterKey?: (typedValue?: string) => void;
  placeholder?: string;
  className?: string;
  /** User location for distance-sorting suggestions. Provided by the parent via useUserLocation(). */
  userLocation?: { lat: number; lng: number } | null;
  /** Called on first focus to trigger precise location request (soft prompt). */
  onSearchFocus?: () => void;
}

export function EnhancedLocationFilter({ 
  value,
  onChange,
  onEnterKey,
  placeholder = "Search by location or postcode...",
  className = "",
  userLocation = null,
  onSearchFocus,
}: EnhancedLocationFilterProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectedSuggestionRef = useRef<{
    text: string;
    type: SearchSuggestion['type'];
    coordinates: { lat: number; lng: number } | null;
  } | null>(null);

  function shouldSearchAsSelectedSuggestion(typedValue: string) {
    const last = lastSelectedSuggestionRef.current;
    if (!last) return false;
    if (!last.coordinates) return false;
    return last.type === 'location' && last.text.trim().toLowerCase() === typedValue.trim().toLowerCase();
  }

  // Update internal query when value prop changes
  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fetch location-only suggestions from Google Places
  const fetchSuggestions = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    try {
      logger.log('🔎 fetchSuggestions called with:', searchQuery);
      
      let allSuggestions: SearchSuggestion[] = [];

      // Only fetch Google Places location suggestions (no users/studios for /studios page)
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

      // Fallback if no results
      if (allSuggestions.length === 0 && searchQuery.length >= 3) {
        logger.log('🔄 Adding fallback location suggestion for:', searchQuery);
        allSuggestions.push({
          id: `fallback-${searchQuery}`,
          text: searchQuery,
          type: 'location' as const,
          metadata: {}
        });
      }

      // Deduplicate
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );

      // Sort using shared sort logic
      const sorted = sortSuggestions(uniqueSuggestions, searchQuery);

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
      logger.warn('🚫 Google Maps Places API not available');
      return [];
    }
    
    logger.log('🗺️ Google Places API available, fetching suggestions for:', searchQuery);

    const places = window.google.maps.places as any;
    const autocompleteService = new places.AutocompleteService();
    const placesService = new places.PlacesService(document.createElement('div'));

    // Same search types as home page for consistent results
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

        // Country restrictions for non-establishments
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

                        // Use shared label formatting — consistent with home page
                        const displayText = formatPlaceLabel({
                          name: place.name,
                          formatted_address: place.formatted_address,
                          description: prediction.description,
                        });

                        detailResolve({
                          id: `place-${place.place_id}`,
                          text: displayText,
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

  // Handle input changes with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    lastSelectedSuggestionRef.current = null;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && onEnterKey) {
        e.preventDefault();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        const typedValue = query.trim();
        if (typedValue) {
          if (shouldSearchAsSelectedSuggestion(typedValue)) {
            onEnterKey();
          } else {
            onChange(typedValue);
            onEnterKey(typedValue);
          }
        } else {
          onEnterKey();
        }
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
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else if (onEnterKey) {
          const typedValue = query.trim();
          if (typedValue) {
            if (shouldSearchAsSelectedSuggestion(typedValue)) {
              onEnterKey();
            } else {
              onChange(typedValue);
              onEnterKey(typedValue);
            }
          } else {
            onEnterKey();
          }
          setIsOpen(false);
          setSelectedIndex(-1);
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
    logger.log('🎯 Suggestion selected:', suggestion);
    lastSelectedSuggestionRef.current = {
      text: suggestion.text,
      type: suggestion.type,
      coordinates: suggestion.metadata?.coordinates ?? null,
    };
    
    setQuery(suggestion.text);
    const placeDetails = suggestion.metadata?.coordinates ? {
      geometry: {
        location: {
          lat: () => suggestion.metadata?.coordinates?.lat || 0,
          lng: () => suggestion.metadata?.coordinates?.lng || 0
        }
      },
      formatted_address: suggestion.text,
      place_id: suggestion.metadata?.place_id
    } : undefined;
    
    logger.log('📍 Location selected, calling onChange with:', suggestion.text, placeDetails);
    onChange(suggestion.text, placeDetails);
    
    setIsOpen(false);
    setSelectedIndex(-1);
  };


  // Handle clicks outside to close suggestions
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideInput = inputRef.current && inputRef.current.contains(target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedInsideInput && !clickedInsideDropdown) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mouseup', handleClickOutside);
    return () => {
      document.removeEventListener('mouseup', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative overflow-visible">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => onSearchFocus?.()}
        className={`w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${className}`}
        autoComplete="off"
      />
      
      {/* Search Button */}
      <button
        type="button"
        onClick={() => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          const typedValue = query.trim();
          if (typedValue) {
            if (onEnterKey && shouldSearchAsSelectedSuggestion(typedValue)) {
              onEnterKey();
            } else {
              onChange(typedValue);
              if (onEnterKey) onEnterKey(typedValue);
            }
          } else if (onEnterKey) {
            onEnterKey();
          }
          setIsOpen(false);
          setSelectedIndex(-1);
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

      {/* Suggestions Dropdown — wider than parent, aligned left, single-line labels */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] left-0 min-w-full w-max max-w-[calc(100vw-2rem)] bg-white border-2 border-gray-300 rounded-lg shadow-2xl max-h-60 overflow-auto mt-1"
          style={{
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
        >
          {isLoadingPlaces && (
            <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
              Loading places...
            </div>
          )}
          
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              ref={(el) => { suggestionRefs.current[index] = el; }}
              className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50 text-gray-900'
              }`}
              onMouseDown={(e) => {
                logger.log('🖱️ Suggestion mouse down:', suggestion.text);
                e.preventDefault();
                e.stopPropagation();
                handleSelect(suggestion);
              }}
              onClick={(e) => {
                logger.log('🖱️ Suggestion clicked:', suggestion.text);
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-900">
                {suggestion.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

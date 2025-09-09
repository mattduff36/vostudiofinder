'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building, X } from 'lucide-react';
import { colors } from '../home/HomePage';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'user';
  metadata?: {
    place_id?: string;
    user_id?: string;
    coordinates?: { lat: number; lng: number };
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);



  // Clear selected location
  const clearLocation = () => {
    setSelectedLocation(null);
    setQuery('');
  };

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

      // If it looks like a location, try Google Places
      if (type === 'location' && window.google?.maps?.places) {
        setIsLoadingPlaces(true);
        try {
          const placeSuggestions = await fetchGooglePlaces(searchQuery);
          allSuggestions = [...allSuggestions, ...placeSuggestions];
        } catch (error) {
          console.warn('Google Places error:', error);
        } finally {
          setIsLoadingPlaces(false);
        }
      }

      // If it looks like a username, search for users
      if (type === 'user') {
        try {
          const userSuggestions = await fetchUserSuggestions(searchQuery);
          allSuggestions = [...allSuggestions, ...userSuggestions];
        } catch (error) {
          console.warn('User search error:', error);
        }
      }

      // Deduplicate suggestions
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );

      // Sort by relevance
      uniqueSuggestions.sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.text.toLowerCase().startsWith(searchQuery.toLowerCase());
        const bExact = b.text.toLowerCase().startsWith(searchQuery.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.text.localeCompare(b.text);
      });

      setSuggestions(uniqueSuggestions.slice(0, 8));
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  // Fetch Google Places suggestions
  const fetchGooglePlaces = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places) {
        resolve([]);
        return;
      }

      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: searchQuery,
          types: ['(cities)', 'postal_code', 'sublocality', 'locality'],
          componentRestrictions: { country: ['us', 'gb', 'ca', 'au'] }
        },
        (predictions: any[], status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const placeSuggestions = predictions.slice(0, 5).map((prediction) => ({
              id: `place-${prediction.place_id}`,
              text: prediction.description,
              type: 'location' as const,
              metadata: {
                place_id: prediction.place_id,
              }
            }));
            resolve(placeSuggestions);
          } else {
            resolve([]);
          }
        }
      );
    });
  };

  // Fetch user suggestions by username
  const fetchUserSuggestions = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    try {
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      return (data.users || []).map((user: any) => ({
        id: `user-${user.id}`,
        text: `${user.username} (${user.display_name || user.username})`,
        type: 'user' as const,
        metadata: {
          user_id: user.id,
          coordinates: user.coordinates
        }
      }));
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
      setSelectedLocation({
        name: suggestion.text,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      });
      setQuery(suggestion.text);
    } else if (suggestion.type === 'user') {
      // For users, we'll use their location
      setSelectedLocation({
        name: suggestion.text,
        ...(suggestion.metadata?.coordinates ? { coordinates: suggestion.metadata.coordinates } : {})
      });
      setQuery(suggestion.text);
    }
    
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Perform search immediately
    performLocationSearch(suggestion.text, suggestion.metadata?.coordinates);
  };

  // Handle search submission
  const handleSearch = () => {
    if (query.trim()) {
      if (selectedLocation) {
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
      {/* Radius Slider - Moved Above Search Bar */}
      {showRadius && (
        <div className="mb-6 p-4 bg-transparent">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white">Search Radius</label>
            <span className="text-sm text-white opacity-80">{radius} miles</span>
          </div>
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-white bg-opacity-20 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(radius - 5) / 195 * 100}%, rgba(255, 255, 255, 0.3) ${(radius - 5) / 195 * 100}%, rgba(255, 255, 255, 0.3) 100%)`
            }}
          />
          <div className="relative text-xs text-white opacity-70 mt-1">
            <div className="flex justify-between">
              <span>5mi</span>
              <span>200mi</span>
            </div>
            <div className="absolute inset-0 flex justify-between pointer-events-none">
              <span style={{ left: '25%', transform: 'translateX(-50%)', position: 'absolute' }}>50mi</span>
              <span style={{ left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}>100mi</span>
              <span style={{ left: '75%', transform: 'translateX(-50%)', position: 'absolute' }} className="hidden sm:block">150mi</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="mt-3 p-3 bg-transparent">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-gray-800 text-sm font-medium shadow-sm">
              <MapPin className="w-3 h-3 text-blue-500" />
              <span>{selectedLocation.name}</span>
              <button
                onClick={clearLocation}
                className="ml-1 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Clear location"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-white text-xs opacity-75">
              Location selected
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
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
                <div className="font-medium text-gray-900">{suggestion.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

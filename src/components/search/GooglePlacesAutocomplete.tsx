'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: {
    description: string;
    place_id: string;
    types: string[];
    structured_formatting?: {
      main_text: string;
      secondary_text: string;
    };
  }) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

export function GooglePlacesAutocomplete({
  onPlaceSelect,
  onInputChange,
  placeholder = "Search studios, services, equipment, or location...",
  value = '',
  className = ''
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      setIsLoaded(true); // Allow fallback functionality
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Don't remove script as it might be used by other components
    };
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;
    
    // Check if Google Places is available
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['place_id', 'formatted_address', 'name', 'types', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place && place.place_id) {
          onPlaceSelect({
            description: place.formatted_address || place.name || '',
            place_id: place.place_id,
            types: place.types || [],
            structured_formatting: {
              main_text: place.name || '',
              secondary_text: place.formatted_address || ''
            }
          });
          
          setInputValue(place.formatted_address || place.name || '');
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.warn('Failed to initialize Google Places Autocomplete:', error);
    }
  }, [isLoaded, onPlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        className="w-full h-12 pl-10 pr-4 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          Google Places autocomplete is not available. Basic search functionality is still available.
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { colors } from '@/components/home/HomePage';

// Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, placeDetails?: any) => void;
  onEnterKey?: () => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  onEnterKey,
  onSearch,
  placeholder = "Enter city, state, or country...",
  className = ""
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAutocompleteSelection, setIsAutocompleteSelection] = useState(false);

  // Keep the onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load Google Maps script with Places library
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    console.log('🗝️ Google Maps API Key check:', apiKey ? 'CONFIGURED' : 'MISSING');
    
    if (!apiKey) {
      console.warn('❌ Google Maps API key not configured - autocomplete will not work');
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('✅ Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    console.log('📡 Loading Google Maps script...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      console.log('✅ Google Maps script loaded successfully');
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps script');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) {
      console.log('🚫 Autocomplete init skipped:', { isLoaded, hasInput: !!inputRef.current, hasAutocomplete: !!autocompleteRef.current });
      return;
    }

    console.log('🎯 Initializing Google Places Autocomplete...');
    
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['(cities)'], // Restrict to cities, regions, and countries
      fields: ['place_id', 'formatted_address', 'name', 'geometry', 'address_components']
    });

    autocompleteRef.current = autocomplete;
    console.log('✅ Autocomplete initialized successfully');

    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place && place.formatted_address) {
        console.log('🎯 Autocomplete place selected:', place.formatted_address, 'with geometry:', !!place.geometry);
        setIsAutocompleteSelection(true);
        onChangeRef.current(place.formatted_address, place);
        
        // Reset flag after a brief delay to allow input onChange to be skipped
        setTimeout(() => {
          setIsAutocompleteSelection(false);
        }, 100);
      }
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded]); // Remove onChange from dependencies to prevent re-initialization

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Skip manual typing changes if autocomplete selection just happened
    if (isAutocompleteSelection) {
      console.log('🚫 Skipping manual input change during autocomplete selection');
      return;
    }
    
    console.log('✍️ Manual typing detected:', e.target.value);
    onChange(e.target.value);
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnterKey) {
      e.preventDefault();
      onEnterKey();
    }
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`w-full pl-10 ${onSearch ? 'pr-14' : 'pr-4'} py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${className}`}
      />
      {onSearch && (
        <button
          type="button"
          onClick={onSearch}
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
      )}
    </div>
  );
}

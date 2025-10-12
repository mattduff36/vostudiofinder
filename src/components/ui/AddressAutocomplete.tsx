'use client';

import React, { useRef, useEffect, useState } from 'react';

// Google Maps types
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: {
              types?: string[];
              fields?: string[];
              componentRestrictions?: unknown;
            }
          ) => {
            addListener(eventName: string, handler: () => void): void;
            getPlace(): {
              formatted_address?: string;
              name?: string;
              place_id?: string;
              address_components?: unknown[];
              geometry?: unknown;
              types?: string[];
            } | undefined;
          };
          [key: string]: unknown; // Allow other Places API properties
        };
        event: {
          clearInstanceListeners(instance: unknown): void;
        };
        [key: string]: unknown; // Allow other Google Maps API properties
      };
    };
  }
}

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  id?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error,
  id,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<{
    addListener(eventName: string, handler: () => void): void;
    getPlace(): {
      formatted_address?: string;
      name?: string;
      place_id?: string;
      address_components?: unknown[];
      geometry?: unknown;
      types?: string[];
    } | undefined;
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const inputId = id || `address-autocomplete-${label.toLowerCase().replace(/\s/g, '-')}`;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured - address autocomplete will not be available');
      setIsLoaded(true); // Allow fallback to manual input
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setIsLoaded(true); // Allow fallback to manual input
    };
    document.head.appendChild(script);

    // Don't remove script on unmount as other components might use it
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    // Check if Google Places is available
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('Google Places API not available');
      return;
    }

    // Initialize autocomplete with expanded types for better coverage
    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        // Remove types restriction to allow all address types including postcodes, establishments, etc.
        // This enables: street addresses, postcodes/zip codes, business names, and more
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'address_components', 'geometry', 'name'],
        componentRestrictions: undefined, // Allow worldwide addresses
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place) {
          // Use formatted_address if available, otherwise use name (for establishments)
          const address = place.formatted_address || place.name || '';
          if (address) {
            onChange(address);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }

    return () => {
      // Cleanup autocomplete listeners
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Start typing an address...'}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
          error ? 'border-red-500' : ''
        }`}
      />
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};


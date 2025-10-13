'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

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
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
              geometry?: unknown;
              types?: string[];
            } | undefined;
          };
        };
        event: {
          clearInstanceListeners(instance: unknown): void;
        };
        [key: string]: unknown;
      };
    };
  }
}

interface CountryAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  id?: string;
}

export const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error,
  id,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any | null>(null);
  const onChangeRef = useRef(onChange); // Store onChange in ref to avoid stale closures
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [isUpdatingFromAutocomplete, setIsUpdatingFromAutocomplete] = useState(false);
  const inputId = id || `country-autocomplete-${label.toLowerCase().replace(/\s/g, '-')}`;

  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync with prop value ONLY when not actively using autocomplete
  // This allows parent updates (like after save) while preventing race conditions
  useEffect(() => {
    if (!isUpdatingFromAutocomplete && value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value, inputValue, isUpdatingFromAutocomplete]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured - country autocomplete will not be available');
      setIsLoaded(true);
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setIsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('Google Places API not available');
      return;
    }

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(regions)'],
        fields: ['name', 'address_components', 'types'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.address_components) {
          const countryComponent = place.address_components.find((component: any) =>
            component.types.includes('country')
          );
          
          const countryName = countryComponent?.long_name || place.name || '';
          if (countryName) {
            setIsUpdatingFromAutocomplete(true);
            setInputValue(countryName);
            onChangeRef.current(countryName); // Use ref instead of prop
            // Clear flag after onChange completes
            setTimeout(() => setIsUpdatingFromAutocomplete(false), 100);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]); // Removed onChange from dependencies to prevent re-initialization

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-2">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        name={`country-field-${Math.random()}`}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder || 'e.g. United Kingdom'}
        autoComplete="chrome-off"
        className={cn(
          'flex h-10 w-full rounded-md border border-form-border bg-transparent px-3 py-2 text-sm text-black ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-form-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus-visible:ring-red-500'
        )}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  );
};



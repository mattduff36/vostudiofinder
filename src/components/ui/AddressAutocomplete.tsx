'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

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
  const autocompleteRef = useRef<any | null>(null);
  const onChangeRef = useRef(onChange); // Store onChange in ref to avoid stale closures
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [isUpdatingFromAutocomplete, setIsUpdatingFromAutocomplete] = useState(false);
  const inputId = id || `address-autocomplete-${label.toLowerCase().replace(/\s/g, '-')}`;

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
      console.warn('Google Maps API key not configured - address autocomplete will not be available');
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
        types: ['geocode', 'establishment'],
        fields: ['formatted_address', 'address_components', 'geometry', 'name'],
        componentRestrictions: undefined,
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place) {
          const address = place.formatted_address || place.name || '';
          if (address) {
            setIsUpdatingFromAutocomplete(true);
            setInputValue(address);
            onChangeRef.current(address); // Use ref instead of prop
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
        name={`address-field-${Math.random()}`}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder || 'Start typing an address...'}
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


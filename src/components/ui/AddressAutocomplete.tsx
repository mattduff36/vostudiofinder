'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ownAutocompletePopup } from '@/lib/ui/overlay-manager';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: any) => void; // Callback for when a place is selected from autocomplete
  placeholder?: string;
  helperText?: string;
  error?: string;
  id?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  label,
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  helperText,
  error,
  id,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any | null>(null);
  const onChangeRef = useRef(onChange); // Store onChange in ref to avoid stale closures
  const onPlaceSelectedRef = useRef(onPlaceSelected); // Store onPlaceSelected in ref
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [isUpdatingFromAutocomplete, setIsUpdatingFromAutocomplete] = useState(false);
  const inputId = id || `address-autocomplete-${label.toLowerCase().replace(/\s/g, '-')}`;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const bind = () => { if (document.activeElement === input) ownAutocompletePopup(input); };
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });
    input.addEventListener('focus', bind); input.addEventListener('input', bind);
    return () => { observer.disconnect(); input.removeEventListener('focus', bind); input.removeEventListener('input', bind); };
  }, []);

  // Update refs when callbacks change
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onChange, onPlaceSelected]);

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
      return undefined;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return undefined;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const onLoad = () => setIsLoaded(true);
      existingScript.addEventListener('load', onLoad);
      return () => existingScript.removeEventListener('load', onLoad);
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
    return () => { script.onload = null; script.onerror = null; };
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
            // Call onPlaceSelected callback if provided
            if (onPlaceSelectedRef.current) {
              onPlaceSelectedRef.current(place);
            }
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
        autocompleteRef.current = null;
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
        name={inputId}
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


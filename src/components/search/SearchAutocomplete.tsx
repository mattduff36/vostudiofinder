'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Mic, Settings, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'studio' | 'service';
}

interface SearchAutocompleteProps {
  placeholder?: string;
  onSelect: (suggestion: SearchSuggestion) => void;
  className?: string;
}

export function SearchAutocomplete({
  placeholder = 'Search locations, studios, or services...',
  onSelect,
  className,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(suggestion);
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'location':
        return MapPin;
      case 'studio':
        return Mic;
      case 'service':
        return Settings;
      default:
        return Search;
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => {
            const IconComponent = getSuggestionIcon(suggestion.type);
            return (
              <li
                key={suggestion.id}
                ref={(el) => { suggestionRefs.current[index] = el; }}
                className={`px-4 py-2 cursor-pointer flex items-center gap-2 ${
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelect(suggestion)}
              >
                <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{suggestion.text}</span>
                <span className="text-xs text-gray-500 capitalize">
                  {suggestion.type}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

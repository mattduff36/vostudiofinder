'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building, Settings, Mic, X } from 'lucide-react';
import { colors } from '../home/HomePage';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'studio' | 'service' | 'equipment';
  metadata?: {
    place_id?: string;
    studio_id?: string;
    coordinates?: { lat: number; lng: number };
  };
}

interface SearchTag {
  id: string;
  type: 'location' | 'studioType' | 'service' | 'equipment';
  value: string;
  display: string;
  icon: string;
}

interface MultiCriteriaSearch {
  location?: string;
  studioType?: string;
  services: string[];
  equipment: string[];
}

interface EnhancedSearchBarProps {
  placeholder?: string;
  className?: string;
  showRadius?: boolean;
  onSearch?: (criteria: MultiCriteriaSearch, radius?: number) => void;
}

export function EnhancedSearchBar({ 
  placeholder = "Search studios, services, equipment, or location...",
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
  const [detectedType, setDetectedType] = useState<string>('general');
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);
  const [isProcessingNLP, setIsProcessingNLP] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Comprehensive keyword databases for NLP parsing
  const keywordDatabase = {
    locations: [
      'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'edinburgh', 'bristol', 'liverpool',
      'new york', 'los angeles', 'chicago', 'houston', 'philadelphia', 'phoenix', 'san antonio',
      'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa', 'sydney', 'melbourne', 'brisbane',
      'uk', 'usa', 'canada', 'australia', 'england', 'scotland', 'wales', 'ireland'
    ],
    studioTypes: [
      'podcast', 'podcasting', 'recording', 'mixing', 'mastering', 'voice over', 'voiceover',
      'broadcast', 'radio', 'tv', 'television', 'music', 'audio', 'sound', 'production',
      'rehearsal', 'live', 'streaming', 'dubbing', 'adr', 'foley', 'post production'
    ],
    services: [
      'isdn', 'source connect', 'cleanfeed', 'sessionlinkpro', 'remote recording', 'live streaming',
      'video conferencing', 'zoom', 'skype', 'teams', 'google meet', 'patch bay', 'monitoring',
      'headphone distribution', 'talkback', 'cue mix', 'overdub', 'punch and roll'
    ],
    equipment: [
      'pro tools', 'logic', 'cubase', 'reaper', 'ableton', 'studio one', 'nuendo',
      'neumann', 'akg', 'shure', 'sennheiser', 'rode', 'audio technica', 'electro voice',
      'ssl', 'neve', 'api', 'focusrite', 'universal audio', 'avid', 'apogee', 'rme',
      'u47', 'u67', 'u87', 'c12', 'ela m251', 'sm57', 'sm58', 're20', 'md421'
    ]
  };

  // Smart NLP parsing function for multi-criteria detection
  const parseMultiCriteriaSearch = (input: string): MultiCriteriaSearch => {
    const lowerInput = input.toLowerCase().trim();
    
    const criteria: MultiCriteriaSearch = {
      services: [],
      equipment: []
    };

    // Location detection (prioritize longer matches)
    const locationMatches = keywordDatabase.locations
      .filter(loc => lowerInput.includes(loc))
      .sort((a, b) => b.length - a.length); // Longer matches first
    
    if (locationMatches.length > 0 && locationMatches[0]) {
      criteria.location = locationMatches[0];
    }

    // Studio type detection
    const studioTypeMatches = keywordDatabase.studioTypes
      .filter(type => lowerInput.includes(type))
      .sort((a, b) => b.length - a.length);
    
    if (studioTypeMatches.length > 0 && studioTypeMatches[0]) {
      criteria.studioType = studioTypeMatches[0];
    }

    // Services detection (can have multiple)
    keywordDatabase.services.forEach(service => {
      if (lowerInput.includes(service)) {
        criteria.services.push(service);
      }
    });

    // Equipment detection (can have multiple)
    keywordDatabase.equipment.forEach(equipment => {
      if (lowerInput.includes(equipment)) {
        criteria.equipment.push(equipment);
      }
    });

    return criteria;
  };

  // Convert parsed criteria to visual tags
  const createTagsFromCriteria = (criteria: MultiCriteriaSearch): SearchTag[] => {
    const tags: SearchTag[] = [];

    if (criteria.location) {
      tags.push({
        id: `location-${Date.now()}`,
        type: 'location',
        value: criteria.location,
        display: criteria.location.charAt(0).toUpperCase() + criteria.location.slice(1),
        icon: '📍'
      });
    }

    if (criteria.studioType) {
      tags.push({
        id: `studioType-${Date.now()}`,
        type: 'studioType',
        value: criteria.studioType,
        display: criteria.studioType.charAt(0).toUpperCase() + criteria.studioType.slice(1) + ' Studio',
        icon: '🎙️'
      });
    }

    criteria.services.forEach((service, index) => {
      tags.push({
        id: `service-${Date.now()}-${index}`,
        type: 'service',
        value: service,
        display: service.toUpperCase(),
        icon: '🔧'
      });
    });

    criteria.equipment.forEach((equipment, index) => {
      tags.push({
        id: `equipment-${Date.now()}-${index}`,
        type: 'equipment',
        value: equipment,
        display: equipment.charAt(0).toUpperCase() + equipment.slice(1),
        icon: '🎚️'
      });
    });

    return tags;
  };

  // Remove a tag
  const removeTag = (tagId: string) => {
    setSearchTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  // Process input with NLP and create tags
  const processInputWithNLP = (input: string) => {
    console.log('🔍 processInputWithNLP called with:', input);
    
    if (!input.trim()) {
      console.log('📝 Empty input, clearing tags and suggestions');
      setSearchTags([]);
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    console.log('⚡ Starting NLP processing and fetching suggestions...');
    setIsProcessingNLP(true);
    
    // Fetch suggestions immediately
    fetchSuggestions(input);
    
    // Add a small delay to show processing state for NLP
    setTimeout(() => {
      console.log('🧠 Parsing multi-criteria search...');
      const criteria = parseMultiCriteriaSearch(input);
      console.log('📊 Parsed criteria:', criteria);
      
      const tags = createTagsFromCriteria(criteria);
      console.log('🏷️ Created tags:', tags);
      
      setSearchTags(tags);
      setIsProcessingNLP(false);
      console.log('✅ NLP processing complete');
    }, 300);
  };

  // Detect search type based on input (legacy function - keeping for compatibility)
  const detectSearchType = (input: string): string => {
    const lowerInput = input.toLowerCase().trim();
    
    // Location patterns
    const locationPatterns = [
      /^[a-z\s]+,\s*[a-z\s]+$/i, // City, Country/State
      /^[a-z\s]+\s+\d{5}$/i, // City ZIP
      /^\d{5}$/i, // ZIP code only
      /^[a-z]{1,2}\d{1,2}\s*\d[a-z]{2}$/i, // UK postcode
      /\b(london|manchester|birmingham|glasgow|edinburgh|cardiff|belfast|dublin|new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|jacksonville|fort worth|columbus|charlotte|san francisco|indianapolis|seattle|denver|washington|boston|el paso|detroit|nashville|portland|oklahoma city|las vegas|louisville|baltimore|milwaukee|albuquerque|tucson|fresno|sacramento|mesa|kansas city|atlanta|long beach|colorado springs|raleigh|miami|virginia beach|omaha|oakland|minneapolis|tulsa|arlington|new orleans|wichita|cleveland|tampa|bakersfield|aurora|honolulu|anaheim|santa ana|corpus christi|riverside|lexington|stockton|toledo|st. paul|newark|greensboro|plano|henderson|lincoln|buffalo|jersey city|chula vista|fort wayne|orlando|st. petersburg|chandler|laredo|norfolk|durham|madison|lubbock|irvine|winston-salem|glendale|garland|hialeah|reno|chesapeake|gilbert|baton rouge|irving|scottsdale|north las vegas|fremont|boise|richmond|san bernardino|birmingham|spokane|rochester|des moines|modesto|fayetteville|tacoma|oxnard|fontana|columbus|montgomery|moreno valley|shreveport|aurora|yonkers|akron|huntington beach|little rock|augusta|amarillo|glendale|mobile|grand rapids|salt lake city|tallahassee|huntsville|grand prairie|knoxville|worcester|newport news|brownsville|overland park|santa clarita|providence|garden grove|chattanooga|oceanside|jackson|fort lauderdale|santa rosa|rancho cucamonga|port st. lucie|tempe|ontario|vancouver|peoria|pembroke pines|salem|cape coral|sioux falls|springfield|peoria|lancaster|elk grove|corona|palmdale|salinas|eugene|pasadena|hayward|pomona|cary|rockford|alexandria|escondido|mckinney|kansas city|joliet|sunnyvale|torrance|bridgeport|lakewood|hollywood|paterson|naperville|syracuse|mesquite|dayton|savannah|clarksville|orange|pasadena|fullerton|killeen|frisco|hampton|mcallen|warren|west valley city|columbia|olathe|sterling heights|new haven|miramar|waco|thousand oaks|cedar rapids|charleston|sioux city|round rock|fargo|carrollton|roseville|concord|thornton|visalia|beaumont|gainesville|simi valley|coral springs|stamford|westminster|sitka|juneau|anchorage|fairbanks|phoenix|tucson|mesa|chandler|glendale|scottsdale|gilbert|tempe|peoria|surprise|yuma|avondale|flagstaff|goodyear|buckeye|casa grande|sierra vista|maricopa|oro valley|prescott|apache junction|marana|el mirage|kingman|bullhead city|prescott valley|florence|somerton|tolleson|youngtown|paradise valley|fountain hills|cave creek|carefree|guadalupe|litchfield park|wickenburg|clarkdale|jerome|sedona|page|winslow|holbrook|show low|payson|globe|superior|mammoth|kearny|hayden|clifton|safford|thatcher|benson|willcox|tombstone|bisbee|douglas|nogales|patagonia|sonoita|tubac|sahuarita|vail|corona de tucson|catalina foothills|casas adobes|flowing wells|tanque verde|oro valley|marana|picture rocks|avra valley|three points|tucson estates|valencia west|drexel heights|summit|catalina|oracle|mammoth|san manuel|winkelman|hayden|kearny|superior|globe|miami|claypool|central heights-midland city|cutter|peridot|bylas|fort thomas|pima|thatcher|safford|solomon|duncan|clifton|morenci|york|franklin|greenlee|alpine|nutrioso|greer|springerville|eagar|st. johns|concho|snowflake|taylor|show low|pinetop-lakeside|whiteriver|mcnary|hon-dah|cibecue|carrizo|cedar creek|forestdale|seven mile|turkey creek|canyon day|east fork|north fork|salt river|tonto basin|young|strawberry|pine|payson|star valley|tonto village|kohls ranch|christopher creek|woods canyon lake|heber-overgaard|clay springs|pinedale|lakeside|pinetop|vernon|greer|eager|springerville|st. johns|concho|snowflake|taylor|show low|whiteriver|mcnary|hon-dah|cibecue|carrizo|cedar creek|forestdale|seven mile|turkey creek|canyon day|east fork|north fork|salt river|tonto basin|young|strawberry|pine|payson|star valley|tonto village|kohls ranch|christopher creek|woods canyon lake|heber-overgaard|clay springs|pinedale)\b/i
    ];
    
    // Studio name patterns (common studio naming conventions)
    const studioPatterns = [
      /\b(studio|studios|recording|audio|sound|voice|vocal|booth|production|media|creative)\b/i,
      /^[a-z0-9]+\s*(studio|recording|audio|sound|voice|vocal|booth|production|media|creative)/i,
      /^(a1|a-1|studio\s*\d+|room\s*\d+)/i
    ];
    
    // Service/Equipment patterns
    const servicePatterns = [
      /\b(isdn|source\s*connect|cleanfeed|session\s*link|zoom|skype|teams|pro\s*tools|logic|cubase|reaper|audacity|neumann|shure|akg|rode|focusrite|universal\s*audio|apollo|scarlett|ssl|neve|api|avalon|tube-tech|la-2a|1176|dbx|lexicon|tc\s*electronic|eventide|waves|plugin|vst|aax|rtas|tdm|midi|xlr|trs|usb|thunderbolt|firewire|adat|spdif|aes|ebu|wordclock|phantom\s*power|preamp|compressor|eq|equalizer|reverb|delay|chorus|flanger|phaser|distortion|overdrive|fuzz|gate|limiter|expander|de-esser|vocal\s*strip|channel\s*strip|console|mixer|interface|converter|monitor|speaker|headphone|microphone|mic|condenser|dynamic|ribbon|pop\s*filter|shock\s*mount|boom|stand|cable|patch\s*bay|di\s*box|direct\s*box|splitter|switcher|router|patchbay|talkback|cue\s*mix|fold\s*back|monitor\s*mix|headphone\s*mix|control\s*room|live\s*room|isolation\s*booth|vocal\s*booth|drum\s*room|piano\s*room|amp\s*room|machine\s*room|server\s*room|patch\s*room|storage|lounge|kitchen|bathroom|parking|wifi|internet|ethernet|fiber|broadband|dsl|cable|satellite|cellular|4g|5g|lte)\b/i
    ];

    // Check patterns in order of specificity
    if (locationPatterns.some(pattern => pattern.test(lowerInput))) {
      return 'location';
    }
    
    if (studioPatterns.some(pattern => pattern.test(lowerInput))) {
      return 'studio';
    }
    
    if (servicePatterns.some(pattern => pattern.test(lowerInput))) {
      return 'service';
    }
    
    // If it's a short alphanumeric string, likely a studio name
    if (/^[a-z0-9]{2,15}$/i.test(lowerInput)) {
      return 'studio';
    }
    
    // If it contains numbers and letters mixed, could be equipment model
    if (/[a-z]+\d+|[a-z]+[-_]\d+|\d+[a-z]+/i.test(lowerInput)) {
      return 'equipment';
    }
    
    return 'general';
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
      setDetectedType(type);
      
      // Fetch from our API
      const url = `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`;
      console.log('📡 Making fetch request to:', url);
      
      const response = await fetch(url);
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      let apiSuggestions: SearchSuggestion[] = [];
      
      if (response.ok) {
        console.log('✅ Response OK, parsing JSON...');
        const data = await response.json();
        console.log('📋 Parsed data:', data);
        apiSuggestions = data.suggestions || [];
        console.log('📝 API suggestions:', apiSuggestions.length, 'items');
      } else {
        console.error('❌ Response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('📄 Error response body:', errorText.substring(0, 200));
      }

      // If it looks like a location, also try Google Places
      let placeSuggestions: SearchSuggestion[] = [];
      if (type === 'location' && window.google?.maps?.places) {
        setIsLoadingPlaces(true);
        try {
          placeSuggestions = await fetchGooglePlaces(searchQuery);
        } catch (error) {
          console.warn('Google Places error:', error);
        } finally {
          setIsLoadingPlaces(false);
        }
      }

      // Combine and deduplicate suggestions
      const allSuggestions = [...placeSuggestions, ...apiSuggestions];
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      );

      // Sort by relevance and type
      uniqueSuggestions.sort((a, b) => {
        // Prioritize by detected type
        if (a.type === type && b.type !== type) return -1;
        if (a.type !== type && b.type === type) return 1;
        
        // Then by exact matches
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
          types: ['(cities)'],
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
    setQuery(suggestion.text);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Perform search with the selected suggestion
    performSearch(suggestion.text, suggestion.type);
  };

  // Handle search submission
  const handleSearch = () => {
    // If we have tags, use multi-criteria search
    if (searchTags.length > 0) {
      performMultiCriteriaSearch();
    } else if (query.trim()) {
      // Fallback to legacy single-criteria search
      const type = detectSearchType(query);
      performSearch(query, type);
    }
  };

  // Perform multi-criteria search using tags
  const performMultiCriteriaSearch = () => {
    // Convert tags back to criteria for search
    const criteria: MultiCriteriaSearch = {
      services: [],
      equipment: []
    };

    searchTags.forEach(tag => {
      switch (tag.type) {
        case 'location':
          criteria.location = tag.value;
          break;
        case 'studioType':
          criteria.studioType = tag.value;
          break;
        case 'service':
          criteria.services.push(tag.value);
          break;
        case 'equipment':
          criteria.equipment.push(tag.value);
          break;
      }
    });

    const params = new URLSearchParams();
    
    // Set parameters based on criteria
    if (criteria.location) {
      params.set('location', criteria.location);
      if (showRadius && radius > 0) {
        params.set('radius', radius.toString());
      }
    }
    if (criteria.studioType) params.set('type', criteria.studioType);
    if (criteria.services.length > 0) params.set('services', criteria.services.join(','));
    if (criteria.equipment.length > 0) params.set('equipment', criteria.equipment.join(','));

    // Call custom handler if provided
    if (onSearch) {
      onSearch(criteria, showRadius ? radius : undefined);
    }

    console.log('Multi-criteria search:', { criteria, params: params.toString() });

    // Navigate to studios page
    router.push(`/studios?${params.toString()}`);
    setIsOpen(false);
  };

  // Perform the actual search (legacy function for backward compatibility)
  const performSearch = (searchQuery: string, searchType: string) => {
    const params = new URLSearchParams();
    
    // Set parameters based on detected type
    switch (searchType) {
      case 'location':
        params.set('location', searchQuery);
        if (showRadius && radius > 0) {
          params.set('radius', radius.toString());
        }
        break;
      case 'studio':
        params.set('q', searchQuery);
        break;
      case 'service':
      case 'equipment':
        params.set('services', searchQuery);
        break;
      default:
        params.set('q', searchQuery);
    }

    // Call custom handler if provided - convert to multi-criteria format
    if (onSearch) {
      const criteria: MultiCriteriaSearch = {
        services: [],
        equipment: []
      };
      
      switch (searchType) {
        case 'location':
          criteria.location = searchQuery;
          break;
        case 'studio':
          criteria.studioType = searchQuery;
          break;
        case 'service':
          criteria.services = [searchQuery];
          break;
        case 'equipment':
          criteria.equipment = [searchQuery];
          break;
      }
      
      onSearch(criteria, showRadius ? radius : undefined);
    }

    // Navigate to studios page
    router.push(`/studios?${params.toString()}`);
    
    // Close suggestions
    setIsOpen(false);
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'location':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'studio':
        return <Building className="w-4 h-4 text-green-500" />;
      case 'service':
        return <Settings className="w-4 h-4 text-purple-500" />;
      case 'equipment':
        return <Mic className="w-4 h-4 text-orange-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get type indicator color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'location': return 'text-blue-600 bg-blue-50';
      case 'studio': return 'text-green-600 bg-green-50';
      case 'service': return 'text-purple-600 bg-purple-50';
      case 'equipment': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`relative ${className}`}>
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
                  
                  // Trigger NLP processing with debounce
                  if (debounceRef.current) {
                    console.log('⏰ Clearing previous debounce timeout');
                    clearTimeout(debounceRef.current);
                  }
                  
                  console.log('⏱️ Setting new debounce timeout (500ms)');
                  debounceRef.current = setTimeout(() => {
                    console.log('🚀 Debounce timeout fired, calling processInputWithNLP');
                    processInputWithNLP(newValue);
                  }, 500); // Slightly longer delay for NLP processing
                }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              
              {/* Type Indicator */}
              {query && detectedType !== 'general' && (
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 rounded text-xs font-medium ${getTypeColor(detectedType)}`}>
                  {detectedType}
                </div>
              )}
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

      {/* Search Tags Display */}
      {(searchTags.length > 0 || isProcessingNLP) && (
        <div className="mt-3 p-3 bg-transparent">
          <div className="flex flex-wrap gap-2 items-center">
            {isProcessingNLP && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white bg-opacity-20 rounded-full text-white text-sm">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </div>
            )}
            
            {searchTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-gray-800 text-sm font-medium shadow-sm"
              >
                <span>{tag.icon}</span>
                <span>{tag.display}</span>
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                  aria-label={`Remove ${tag.display} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {searchTags.length > 0 && (
              <div className="text-white text-xs opacity-75 ml-2">
                {searchTags.length} filter{searchTags.length !== 1 ? 's' : ''} active
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Radius Slider - Always Visible with Transparent Background */}
      {showRadius && (
        <div className="mt-4 p-4 bg-transparent">
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
          <div className="flex justify-between text-xs text-white opacity-70 mt-1">
            <span>5mi</span>
            <span>50mi</span>
            <span>100mi</span>
            <span>200mi</span>
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
                  ? 'bg-primary-50 text-primary-900'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(suggestion)}
            >
              {getSuggestionIcon(suggestion.type)}
              <div className="flex-1">
                <div className="font-medium">{suggestion.text}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded capitalize ${getTypeColor(suggestion.type)}`}>
                {suggestion.type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

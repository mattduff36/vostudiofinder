'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown, Grid, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Studio {
  id: string;
  name: string;
  description: string;
  location: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  studioType: string;
  services: string[];
  price?: string;
  timeAgo?: string;
}

export function StudiosNewDesign2() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  
  // Craigslist-style filters
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    location: 'New Jersey', // Default like Craigslist
    category: 'All Categories',
    sortBy: 'newest',
  });

  const categories = [
    'All Categories',
    'Recording Studios', 
    'Podcast Studios',
    'Home Studios',
    'Production Studios',
    'Mobile Studios'
  ];

  const handleSearch = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setSearchResults({
        studios: Array.from({ length: 15 }, (_, i) => ({
          id: `studio-${i}`,
          name: `Professional Recording Studio ${i + 1}`,
          description: 'State-of-the-art recording facility with Pro Tools HD, Neumann microphones, and acoustically treated rooms. Perfect for music production, voice-over work, and podcast recording.',
          location: i % 3 === 0 ? 'Jersey City, NJ' : i % 3 === 1 ? 'Newark, NJ' : 'Hoboken, NJ',
          rating: 4.5 + (Math.random() * 0.5),
          reviewCount: Math.floor(Math.random() * 50) + 10,
          studioType: categories[Math.floor(Math.random() * (categories.length - 1)) + 1],
          services: ['Pro Tools', 'Logic Pro', 'Mixing', 'Mastering'],
          price: `$${50 + (i * 10)}/hr`,
          timeAgo: `${Math.floor(Math.random() * 7) + 1} hrs ago`
        })),
        pagination: { page: 1, limit: 20, totalCount: 1397 }
      });
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Craigslist-style Header */}
      <div className="bg-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">VoStudioFinder</h1>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-purple-200 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <button className="bg-purple-600 px-3 py-1 rounded">Create an Ad</button>
              <button className="bg-purple-600 px-3 py-1 rounded">My Account</button>
              <div className="flex items-center gap-1">
                🇺🇸 <span>EN</span> <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-100 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search recording studios"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <select
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="New Jersey">New Jersey</option>
                <option value="New York">New York</option>
                <option value="Pennsylvania">Pennsylvania</option>
              </select>
            </div>

            <Button
              onClick={handleSearch}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        
        {/* Left Sidebar - Craigslist Style */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white">
            
            {/* Admin/Office Section */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Studio Type</h3>
              <div className="space-y-2 text-sm">
                {[
                  { name: 'Search titles only', count: 12 },
                  { name: 'Has image', count: 8 },
                  { name: 'Posted today', count: 3 },
                  { name: 'Bundle duplicates', count: 17 },
                  { name: 'Remote positions', count: 32 },
                  { name: 'Include nearby areas', count: 45 }
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-blue-600 hover:underline">{item.name}</span>
                    <span className="text-gray-500 text-xs">{item.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Employment Type */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ChevronDown className="w-4 h-4" />
                Equipment Type
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { name: 'Full time', count: 76 },
                  { name: 'Part time', count: 12 },
                  { name: 'Contract', count: 15 },
                  { name: 'Internship', count: 21 },
                  { name: 'Non profit', count: 12 },
                  { name: 'Telecommute', count: 17 }
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-blue-600 hover:underline">{item.name}</span>
                    <span className="text-gray-500 text-xs">{item.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ChevronDown className="w-4 h-4" />
                Services
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { name: 'Pro Tools', count: 76 },
                  { name: 'Logic Pro', count: 12 },
                  { name: 'Mixing', count: 21 },
                  { name: 'Mastering', count: 12 },
                  { name: 'ISDN', count: 12 },
                  { name: 'Source Connect', count: 12 }
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-blue-600 hover:underline">{item.name}</span>
                    <span className="text-gray-500 text-xs">{item.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Related Searches */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                Related searches
                <ChevronDown className="w-4 h-4" />
              </h3>
            </div>

            <Button
              variant="outline"
              className="w-full flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Filter
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Showing: <strong>{searchResults?.pagination.totalCount || 0}</strong> Search results
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span>Sort By:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm bg-purple-100"
                >
                  <option value="newest">Newest</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button className="p-2 border border-gray-300 rounded hover:bg-gray-50">
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid - Craigslist Style */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading studios...</p>
            </div>
          ) : searchResults ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.studios.map((studio: Studio) => (
                <div 
                  key={studio.id} 
                  className="border-2 border-red-500 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
                  style={{ minHeight: '200px' }}
                >
                  {/* Studio Image Placeholder */}
                  <div className="w-full h-32 bg-gray-200 rounded mb-3 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Studio Image</span>
                  </div>
                  
                  {/* Studio Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {studio.name}
                      </h3>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" />
                        {studio.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                          {studio.studioType}
                        </span>
                        <span className="text-gray-500">{studio.timeAgo}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {studio.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1">
                        <div className="flex text-yellow-400 text-xs">
                          {'★'.repeat(Math.floor(studio.rating || 4))}
                        </div>
                        <span className="text-xs text-gray-500">({studio.reviewCount})</span>
                      </div>
                      <span className="font-semibold text-sm text-green-600">{studio.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No studios found.</p>
            </div>
          )}

          {/* Pagination */}
          {searchResults && (
            <div className="flex items-center justify-center gap-2 mt-8 text-sm">
              <button className="px-3 py-1 text-blue-600 hover:underline">← Prev</button>
              {[1, 2, 3, 4, 5].map(num => (
                <button 
                  key={num}
                  className={`px-3 py-1 ${num === 1 ? 'bg-purple-600 text-white' : 'text-blue-600 hover:underline'} rounded`}
                >
                  {num}
                </button>
              ))}
              <span>...</span>
              <button className="px-3 py-1 text-blue-600 hover:underline">7</button>
              <button className="px-3 py-1 text-blue-600 hover:underline">Next →</button>
              <div className="ml-4">
                <button className="text-blue-600 hover:underline flex items-center gap-1">
                  Back to top ↑
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

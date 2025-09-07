'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, Grid, List, Star, ArrowLeft, Heart } from 'lucide-react';
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
  verified?: boolean;
  featured?: boolean;
  availability?: 'available' | 'busy' | 'offline';
}

export function StudiosNewDesign3() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [activeCategory, setActiveCategory] = useState('all');
  
  const [filters, setFilters] = useState({
    query: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    studioType: searchParams.get('studioType') || '',
    services: searchParams.get('services')?.split(',') || [],
    sortBy: searchParams.get('sortBy') || 'relevance',
    priceRange: 'all',
    availability: 'all',
    rating: 0,
  });

  const categories = [
    { id: 'all', name: 'All Studios', icon: '🎵', count: 1247 },
    { id: 'recording', name: 'Recording', icon: '🎤', count: 523 },
    { id: 'podcast', name: 'Podcast', icon: '🎙️', count: 312 },
    { id: 'mixing', name: 'Mixing', icon: '🎛️', count: 198 },
    { id: 'mastering', name: 'Mastering', icon: '✨', count: 156 },
    { id: 'live', name: 'Live Room', icon: '🎸', count: 89 },
  ];

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setSearchResults({
        studios: Array.from({ length: 12 }, (_, i) => ({
          id: `studio-${i}`,
          name: `${['Sonic', 'Audio', 'Sound', 'Echo', 'Wave', 'Beat'][i % 6]} Studios ${i + 1}`,
          description: 'Professional recording studio with state-of-the-art equipment and acoustically treated rooms. Perfect for music production, podcasting, and voice-over work.',
          location: ['London, UK', 'Manchester, UK', 'Birmingham, UK', 'Leeds, UK'][i % 4],
          rating: 4.2 + (Math.random() * 0.8),
          reviewCount: Math.floor(Math.random() * 100) + 20,
          studioType: ['Recording Studio', 'Podcast Studio', 'Home Studio'][i % 3],
          services: ['Pro Tools', 'Logic Pro', 'Mixing', 'Mastering'].slice(0, Math.floor(Math.random() * 3) + 2),
          price: `£${30 + (i * 5)}/hr`,
          verified: i % 3 === 0,
          featured: i % 5 === 0,
          availability: ['available', 'busy', 'offline'][i % 3] as 'available' | 'busy' | 'offline'
        })),
        pagination: { page: 1, limit: 12, totalCount: 1247 }
      });
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Available Now';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      
      {/* Modern Header with Glassmorphism */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Home</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Saved (3)
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" style={{ backgroundColor: '#d42027' }}>
                List Your Studio
              </Button>
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="pb-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Studio</h1>
              <p className="text-gray-600">Discover professional recording studios worldwide</p>
            </div>

            {/* Main Search Bar */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search for studios, equipment, or services..."
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                  className="w-full pl-12 pr-32 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <Button
                    onClick={handleSearch}
                    loading={loading}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-xl"
                    style={{ backgroundColor: '#d42027' }}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === category.id
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                  style={activeCategory === category.id ? { backgroundColor: '#d42027' } : {}}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeCategory === category.id ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap justify-center gap-3">
              <select
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">📍 Any Location</option>
                <option value="london">London, UK</option>
                <option value="manchester">Manchester, UK</option>
                <option value="birmingham">Birmingham, UK</option>
              </select>

              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">💰 Any Price</option>
                <option value="budget">£20-50/hr</option>
                <option value="mid">£50-100/hr</option>
                <option value="premium">£100+/hr</option>
              </select>

              <select
                value={filters.availability}
                onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value }))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">⏰ Any Time</option>
                <option value="available">Available Now</option>
                <option value="today">Available Today</option>
                <option value="week">This Week</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Results Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {searchResults ? `${searchResults.pagination.totalCount.toLocaleString()} Studios Found` : 'Loading...'}
            </h2>
            <p className="text-gray-600 mt-1">
              {searchResults && `Showing ${((searchResults.pagination.page - 1) * searchResults.pagination.limit) + 1}-${Math.min(searchResults.pagination.page * searchResults.pagination.limit, searchResults.pagination.totalCount)} results`}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="relevance">Most Relevant</option>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
            
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderBottomColor: '#d42027' }}></div>
            <p className="text-gray-600 text-lg">Finding the perfect studios for you...</p>
          </div>
        ) : searchResults ? (
          <div className={viewMode === 'cards' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' 
            : 'space-y-6'
          }>
            {searchResults.studios.map((studio: Studio) => (
              <div 
                key={studio.id} 
                className={`group bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all duration-300 overflow-hidden ${
                  viewMode === 'list' ? 'flex gap-6 p-6' : 'p-6'
                } ${studio.featured ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}`}
              >
                
                {/* Studio Image */}
                <div className={`${viewMode === 'list' ? 'w-48 h-32' : 'w-full h-48'} bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-4 flex-shrink-0 relative overflow-hidden`}>
                  {studio.featured && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-lg text-xs font-bold">
                      ⭐ FEATURED
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${getAvailabilityColor(studio.availability || 'offline')}`}></div>
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Studio Image
                  </div>
                </div>

                <div className="flex-1">
                  {/* Studio Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                          {studio.name}
                        </h3>
                        {studio.verified && (
                          <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                            ✓ Verified
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {studio.location}
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Studio Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {studio.description}
                  </p>

                  {/* Services Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {studio.services.slice(0, 3).map((service, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                        {service}
                      </span>
                    ))}
                    {studio.services.length > 3 && (
                      <span className="text-gray-500 text-xs">+{studio.services.length - 3} more</span>
                    )}
                  </div>

                  {/* Studio Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="font-semibold text-sm">{studio.rating?.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm">({studio.reviewCount})</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(studio.availability || 'offline')}`}></div>
                        {getAvailabilityText(studio.availability || 'offline')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-gray-900">{studio.price}</div>
                      <Button 
                        size="sm" 
                        className="mt-2 bg-red-600 hover:bg-red-700 group-hover:shadow-lg transition-all"
                        style={{ backgroundColor: '#d42027' }}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Studios Found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or browse all studios.</p>
          </div>
        )}

        {/* Load More Button */}
        {searchResults && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 border-2 hover:bg-gray-50"
            >
              Load More Studios
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export default function AdminVenuesPage() {
  const [venueData, setVenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchVenues();
  }, [search]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/venues?${params}`); // Updated API endpoint
      if (!response.ok) {
        throw new Error('Failed to fetch venues');
      }
      
      const data = await response.json();
      setVenueData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const parseCoordinate = (coord: any) => {
    if (!coord || coord === '') return null;
    const parsed = parseFloat(coord);
    return isNaN(parsed) ? null : parsed;
  };

  const formatCoordinate = (coord: any) => {
    const parsed = parseCoordinate(coord);
    return parsed !== null ? parsed.toFixed(6) : 'N/A';
  };

  const getGoogleMapsUrl = (venue: any) => {
    const lat = parseCoordinate(venue.latitude || venue.lat);
    const lon = parseCoordinate(venue.longitude || venue.lon);
    
    if (lat !== null && lon !== null) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' London')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">Error Loading Venues</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={fetchVenues}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!venueData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📍 London Recording Venues</h1>
        <p className="text-gray-600 mt-1">
          {/* @ts-expect-error - Type assertion needed for dynamic data */}
          {venueData.statistics?.total || venueData.venues?.length || 0} professional recording venues in London
        </p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Venues
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by venue name or description..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">🗺️ Venue Locations</h2>
          <p className="text-gray-600 mt-1">Interactive map showing all venue locations</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-green-50 p-12 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h3>
            <p className="text-gray-600 mb-4">
              {/* @ts-expect-error - Type assertion needed for dynamic data */}
              Map showing {venueData.statistics?.total || venueData.venues?.length || 0} venues centered around London
            </p>
            {/* @ts-expect-error - Type assertion needed for dynamic data */}
            {venueData.statistics?.center && (
              <p className="text-sm text-gray-500">
                {/* @ts-expect-error - Type assertion needed for dynamic data */}
                Center: {formatCoordinate(venueData.statistics.center.lat)}, {formatCoordinate(venueData.statistics.center.lon)}
              </p>
            )}
            <div className="mt-4">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=London+recording+studios`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* @ts-expect-error - Type assertion needed for dynamic data */}
        {(venueData.venues || []).map((venue: any) => (
          <div key={venue.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {venue.name}
                </h3>
              </div>
              <div className="flex-shrink-0 ml-4">
                <a
                  href={getGoogleMapsUrl(venue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Map
                </a>
              </div>
            </div>

            {/* Description */}
            {venue.description && (
              <div className="mb-4">
                <div 
                  className="text-sm text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: venue.description.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>
            )}

            {/* Address */}
            {venue.address && (
              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{venue.address}</span>
                </div>
              </div>
            )}

            {/* Location Details */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  Latitude: {formatCoordinate(venue.latitude || venue.lat)}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  Longitude: {formatCoordinate(venue.longitude || venue.lon)}
                </span>
              </div>

              {(parseCoordinate(venue.latitude || venue.lat) !== null && parseCoordinate(venue.longitude || venue.lon) !== null) && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Coordinates: {formatCoordinate(venue.latitude || venue.lat)}, {formatCoordinate(venue.longitude || venue.lon)}
                  </span>
                </div>
              )}

              {venue.category && (
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>Category: {venue.category}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-gray-100 mt-4">
              <span>Venue ID: {venue.id}</span>
              <span>📍 London, UK</span>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {/* @ts-expect-error - Type assertion needed for dynamic data */}
      {(!venueData.venues || venueData.venues.length === 0) && !loading && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No venues found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria.
          </p>
        </div>
      )}

      {/* Venue Statistics */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Venue Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            {/* @ts-expect-error - Type assertion needed for dynamic data */}
            <div className="text-2xl font-bold text-blue-600">{venueData.statistics?.total || venueData.venues?.length || 0}</div>
            <div className="text-sm text-gray-600">Total Venues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">🏙️</div>
            <div className="text-sm text-gray-600">London Area</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">🎙️</div>
            <div className="text-sm text-gray-600">Recording Studios</div>
          </div>
        </div>
      </div>
    </div>
  );
}

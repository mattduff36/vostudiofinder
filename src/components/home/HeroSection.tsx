'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GooglePlacesAutocomplete } from '@/components/search/GooglePlacesAutocomplete';

import { Mic, Users, MapPin } from 'lucide-react';
import Image from 'next/image';

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    router.push(`/studios?${params.toString()}`);
  };

  const handlePlaceSelect = (place: any) => {
    // Set the search query to the selected place
    setSearchQuery(place.description);
    
    // Immediately perform search with the selected location
    const params = new URLSearchParams();
    params.set('location', place.description);
    router.push(`/studios?${params.toString()}`);
  };

  return (
    <div className="relative text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bottom-banner.jpg"
          alt="Professional recording studio"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800/90 to-primary-600/90"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 px-6 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-5xl md:text-6xl font-bold mb-6 transition-all duration-1000 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            Find Your Perfect
            <br />
            <span className="text-accent-400">Recording Studio</span>
          </h1>
          
          <p className={`text-xl md:text-2xl text-primary-100 mb-12 max-w-3xl mx-auto transition-all duration-1000 delay-400 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            Connect with professional voiceover recording studios worldwide. 
            Advanced search, verified locations, and direct studio contact.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className={`max-w-4xl mx-auto transition-all duration-1000 delay-600 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <div className="bg-white rounded-lg p-4 shadow-2xl">
              <div className="flex gap-4">
                <div className="flex-1" style={{ width: '75%' }}>
                  <GooglePlacesAutocomplete
                    value={searchQuery}
                    onInputChange={setSearchQuery}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Search studios, services, equipment, or location..."
                  />
                </div>
                
                <Button
                  type="submit"
                  className="h-12 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold whitespace-nowrap flex items-center justify-center"
                  style={{ width: '25%' }}
                >
                  Search Studios
                </Button>
              </div>
            </div>
          </form>

          {/* Feature Icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
            <div className={`text-center transition-all duration-1000 delay-700 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300">
                <Mic className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Professional Studios</h3>
              <p className="text-primary-200">
                Verified recording studios with professional equipment and acoustics
              </p>
            </div>
            
            <div className={`text-center transition-all duration-1000 delay-800 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Locations</h3>
              <p className="text-primary-200">
                Find studios worldwide with precise location mapping and directions
              </p>
            </div>
            
            <div className={`text-center transition-all duration-1000 delay-900 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Direct Contact</h3>
              <p className="text-primary-200">
                Connect directly with studio owners and book sessions instantly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-12"></div>
      </div>
    </div>
  );
}

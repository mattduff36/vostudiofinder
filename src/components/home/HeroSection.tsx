'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

import { Search, Mic, Users, MapPin } from 'lucide-react';
import Image from 'next/image';

interface HeroSectionProps {
  session: Session | null;
}

export function HeroSection({ session }: HeroSectionProps) {
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
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold">
            VoiceoverStudioFinder
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="/studios" className="hover:text-primary-200 transition-colors">
              Browse Studios
            </a>
            <a href="/about" className="hover:text-primary-200 transition-colors">
              About
            </a>
            <a href="/contact" className="hover:text-primary-200 transition-colors">
              Contact
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <span className="text-sm">Welcome, {session.user.displayName}</span>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-primary-800"
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push('/auth/signin')}
                  variant="ghost"
                  className="text-white hover:bg-primary-700"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/auth/signup')}
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-primary-800"
                >
                  List Your Studio
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 px-6 py-20">
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
                <div className="relative flex-1" style={{ width: '75%' }}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search studios, services, equipment, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

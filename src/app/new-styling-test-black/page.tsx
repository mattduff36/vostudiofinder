'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Mic, MapPin, Users, Building, Star, Globe } from 'lucide-react';

// New color palette
const colors = {
  primary: '#d42027',
  primaryHover: '#a1181d',
  background: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#444444',
  textSubtle: '#888888',
};

interface Studio {
  id: string;
  name: string;
  description: string;
  studioType: 'RECORDING' | 'HOME';
  address?: string;
  owner: {
    displayName: string;
  };
  services: Array<{
    service: string;
  }>;
  images: Array<{
    imageUrl: string;
    altText: string;
  }>;
}

// Mock data for the test
const mockStudios: Studio[] = [
  {
    id: '1',
    name: 'Mike Cooper',
    description: 'A great home studio with a view of Mt Pisgah, nestled in Hominy Valley, 25 minutes from downtown Asheville in Pisgah National Forest. I have a broadcast quality phone patch and can connect with all the VOIP codecs.',
    studioType: 'RECORDING',
    owner: { displayName: 'Mike Cooper' },
    services: [
      { service: 'SOURCE_CONNECT' },
      { service: 'SOURCE_CONNECT_NOW' },
      { service: 'SKYPE' }
    ],
    images: [
      {
        imageUrl: 'https://res.cloudinary.com/dmvaawjnx/image/upload/v1756934833/voiceover-studios/studios/odhrewap60f5si1bxrie.jpg',
        altText: 'Mike Cooper Voice Studio'
      }
    ]
  },
  {
    id: '2',
    name: 'S2Blue',
    description: 'Over the years we have cultivated an impressive client base, which includes all of the major broadcasters in British media. Our productions have been heard on radio and TV stations across the world.',
    studioType: 'RECORDING',
    owner: { displayName: 'S2Blue' },
    services: [
      { service: 'ISDN' },
      { service: 'SKYPE' },
      { service: 'ZOOM' }
    ],
    images: [
      {
        imageUrl: 'https://res.cloudinary.com/dmvaawjnx/image/upload/v1756934829/voiceover-studios/studios/uxmn2f5lrnw2pfcqewpz.jpg',
        altText: 'S2Blue Recording Studio'
      }
    ]
  },
  {
    id: '3',
    name: 'VoiceoverGuy',
    description: 'A broadcast quality studio for hire in West Yorkshire in the UK. Suitable for Audiobook voiceover recording, Interviews including down the line interviews connecting with broadcasters worldwide.',
    studioType: 'HOME',
    address: '205 Batley Rd, Kirkhamgate, Wakefield WF2 0SH, UK',
    owner: { displayName: 'VoiceoverGuy' },
    services: [
      { service: 'SOURCE_CONNECT_NOW' },
      { service: 'SESSION_LINK_PRO' },
      { service: 'ZOOM' }
    ],
    images: [
      {
        imageUrl: 'https://res.cloudinary.com/dmvaawjnx/image/upload/v1756934827/voiceover-studios/studios/focy1crquetwuekkckqf.jpg',
        altText: 'VoiceoverGuy Professional Studio'
      }
    ]
  }
];

export default function NewStylingTestBlackPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroOpacity, setHeroOpacity] = useState(0); // Set to 0% opacity
  const [featuredStudios, setFeaturedStudios] = useState<Studio[]>([]);

  useEffect(() => {
    setIsLoaded(true);
    // Simulate fetching data
    setFeaturedStudios(mockStudios);
  }, []);

  const cleanDescription = (description: string) => {
    return description.length > 150 ? description.substring(0, 150) + '...' : description;
  };

  const formatService = (service: string) => {
    return service.replace(/_/g, ' ');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      {/* Opacity Control Panel */}
      <div className="fixed top-4 right-4 z-[60] bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <div className="text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
          Hero Background Opacity
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs" style={{ color: colors.textSubtle }}>0%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={heroOpacity}
            onChange={(e) => setHeroOpacity(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${heroOpacity * 100}%, #e5e7eb ${heroOpacity * 100}%, #e5e7eb 100%)`
            }}
          />
          <span className="text-xs" style={{ color: colors.textSubtle }}>100%</span>
        </div>
        <div className="text-xs mt-1 text-center" style={{ color: colors.textSecondary }}>
          {Math.round(heroOpacity * 100)}%
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ backgroundColor: colors.background, borderBottom: '1px solid #f0f0f0' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a className="text-2xl font-bold transition-colors hover:opacity-80" href="/" style={{ color: colors.primary }}>
              VoiceoverStudioFinder
            </a>
            <div className="hidden md:flex items-center space-x-8">
              <a className="transition-colors hover:opacity-80" href="/studios" style={{ color: colors.textSecondary }}>
                Browse Studios
              </a>
              <a className="transition-colors hover:opacity-80" href="/about" style={{ color: colors.textSecondary }}>
                About
              </a>
              <a className="transition-colors hover:opacity-80" href="/contact" style={{ color: colors.textSecondary }}>
                Contact
              </a>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <button
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:opacity-90"
                style={{ color: colors.textPrimary, border: `1px solid ${colors.textSubtle}` }}
              >
                Sign In
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: colors.primary, color: colors.background }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                List Your Studio
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
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
            <div 
              className="absolute inset-0 transition-all duration-300" 
              style={{ backgroundColor: `${colors.primary}${Math.round(heroOpacity * 255).toString(16).padStart(2, '0')}` }}
            ></div>
          </div>

          {/* Hero Content */}
          <div className="relative z-10 px-6 pt-32 pb-20">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className={`text-5xl md:text-6xl font-bold mb-6 transition-all duration-1000 delay-200 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`} style={{ color: '#ffffff' }}>
                Find Your Perfect<br/>
                <span style={{ color: colors.primary }}>Recording Studio</span>
              </h1>
              <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
                isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
              }`} style={{ transitionDelay: '0.4s', color: '#d1d5db' }}>
                Connect with professional voiceover recording studios worldwide.<br/>Advanced search, verified locations, and direct studio contact.
              </p>
              
              {/* Search Form */}
              <div className={`max-w-4xl mx-auto mt-12 transition-all duration-1000 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`} style={{ transitionDelay: '0.6s' }}>
                <div className="bg-white rounded-xl p-4 shadow-2xl">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: colors.textSubtle }} />
                        <input
                          type="text"
                          placeholder="Search studios, services, equipment, or location..."
                          className="w-full h-12 pl-10 pr-4 border border-gray-200 rounded-lg focus:ring-2 focus:border-transparent"
                          style={{ color: colors.textPrimary, '--tw-ring-color': colors.primary } as React.CSSProperties}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      className="h-12 px-6 font-semibold rounded-lg transition-all duration-300 hover:shadow-lg"
                      style={{ backgroundColor: colors.primary, color: colors.background }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                      type="submit"
                    >
                      Search Studios
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature Icons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
                {[
                  { icon: Mic, title: 'Professional Studios', description: 'Verified recording studios with professional equipment and acoustics' },
                  { icon: MapPin, title: 'Global Locations', description: 'Find studios worldwide with precise location mapping and directions' },
                  { icon: Users, title: 'Direct Contact', description: 'Connect directly with studio owners and book sessions instantly' }
                ].map((feature, index) => (
                  <div key={index} className={`text-center transition-all duration-1000 ${
                    isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`} style={{ transitionDelay: `${0.7 + index * 0.1}s` }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                    <p className="text-white">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="relative py-16 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/bakground-images/21920-7.jpg"
              alt="Stats background texture"
              fill
              className="object-cover opacity-10"
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: colors.textPrimary }}>
                Trusted by Voice Professionals Worldwide
              </h2>
              <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
                isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
              }`} style={{ transitionDelay: '0.2s', color: colors.textSecondary }}>
                Join thousands of voice artists and studio owners who use VoiceoverStudioFinder
                to connect and collaborate on projects.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: Building, number: '50+', label: 'Recording Studios', color: colors.primary },
                { icon: Users, number: '0+', label: 'Registered Users', color: '#ff9800' },
                { icon: Star, number: '0+', label: 'Countries', color: '#4caf50' },
                { icon: Globe, number: '24/7', label: 'Global Access', color: '#2196f3' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transform hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
                  </div>
                  <div className="text-3xl font-bold mb-2" style={{ color: colors.textPrimary }}>
                    {stat.number}
                  </div>
                  <div style={{ color: colors.textSecondary }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Studios Section */}
        <div className="relative py-16 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/bakground-images/21920-2.jpg"
              alt="Studio background texture"
              fill
              className="object-cover opacity-10"
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: colors.textPrimary }}>Featured Recording Studios</h2>
              <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
                isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
              }`} style={{ transitionDelay: '0.2s', color: colors.textSecondary }}>
                Discover professional recording studios with verified locations, top-rated equipment, and experienced engineers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredStudios.map((studio) => (
                <div key={studio.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-xl hover:border-gray-300 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full cursor-pointer group">
                  <div className="aspect-video bg-gray-200 rounded-t-xl overflow-hidden relative">
                    {studio.images?.[0]?.imageUrl ? (
                      <Image src={studio.images[0].imageUrl} alt={studio.images[0].altText || studio.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><Users className="w-12 h-12" /></div>
                    )}
                    <div className="absolute bottom-3 right-3">
                      <span className="inline-block px-3 py-1 text-white text-xs font-medium rounded-full shadow-lg" style={{ backgroundColor: colors.primary }}>
                        {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow max-h-[500px]">
                    <div className="mb-3">
                      <h3 className="text-xl font-semibold line-clamp-1" style={{ color: colors.textPrimary }}>{studio.name}</h3>
                    </div>
                    {studio.address && studio.address.trim() && (
                      <div className="flex items-start mb-3" style={{ color: colors.textSecondary }}>
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm line-clamp-2">{studio.address}</span>
                      </div>
                    )}
                    <div className="relative flex-grow mb-4 overflow-hidden">
                      <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                        {cleanDescription(studio.description)}
                      </p>
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                    </div>
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {studio.services.slice(0, 3).map((service, serviceIndex) => (
                          <span key={serviceIndex} className="inline-block px-2 py-1 bg-gray-100 text-xs rounded" style={{ color: colors.textSecondary }}>
                            {formatService(service.service)}
                          </span>
                        ))}
                        {studio.services.length > 3 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-xs rounded" style={{ color: colors.textSecondary }}>
                            +{studio.services.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div className="flex items-center space-x-3 text-sm" style={{ color: colors.textSecondary }}>
                        <span>{studio.owner.displayName}</span>
                        <span className="text-green-600 font-medium text-xs">✓ Verified</span>
                      </div>
                      <div className="px-3 py-1.5 text-sm font-medium rounded-lg group-hover:shadow-md transition-all duration-300 pointer-events-none" style={{ backgroundColor: colors.primary, color: colors.background }}>
                        View Details
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <button className="px-8 py-3 font-medium rounded-lg transition-all duration-300 hover:shadow-lg" style={{ border: `1px solid ${colors.primary}`, color: colors.primary, backgroundColor: 'transparent' }}>
                View All Studios
              </button>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative py-16 overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/bottom-banner.jpg"
              alt="Professional recording studio"
              fill
              className="object-cover"
              priority
            />
            <div 
              className="absolute inset-0 transition-all duration-300" 
              style={{ backgroundColor: `${colors.primary}${Math.round(heroOpacity * 255).toString(16).padStart(2, '0')}` }}
            ></div>
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center text-white mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
                isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
              }`} style={{ transitionDelay: '0.2s', color: '#d1d5db' }}>
                Whether you're a voice artist looking for the perfect studio or a studio owner
                wanting to connect with talent, VoiceoverStudioFinder has you covered.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[
                { icon: Mic, title: 'For Voice Artists', points: ['Find studios near you or worldwide', 'Compare equipment and services', 'Read reviews from other artists', 'Book sessions directly with studios'] },
                { icon: Building, title: 'For Studio Owners', points: ['Reach thousands of voice artists worldwide', 'Professional listing with photos & details', 'Direct bookings from qualified clients', 'Only £25/year - exceptional value'] },
                { icon: Users, title: 'For Everyone', points: ['Join a global community', 'Network with professionals', 'Share experiences and tips', 'Stay updated on industry trends'] }
              ].map((section, index) => (
                <div key={index} className="text-center text-white">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
                    <section.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{section.title}</h3>
                  <ul className="space-y-2 text-sm" style={{ color: '#d1d5db' }}>
                    {section.points.map((point, pointIndex) => (
                      <li key={pointIndex}>• {point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: colors.background, color: colors.primary }}>
                List Your Studio - £25/year
              </button>
              <button className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl" style={{ border: `1px solid ${colors.background}`, color: colors.background, backgroundColor: 'transparent' }}>
                Browse Studios
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4" style={{ color: colors.primary }}>VoiceoverStudioFinder</h3>
              <p className="mb-6 max-w-md" style={{ color: colors.textSubtle }}>
                The world's leading platform for connecting voice artists with professional recording studios. Find your perfect studio or showcase your space to a global community of voice professionals.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm" style={{ color: colors.textSubtle }}>
                <li><a href="/studios" className="hover:text-white transition-colors">Browse Studios</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm" style={{ color: colors.textSubtle }}>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 mt-8 text-center" style={{ borderColor: '#333333' }}>
            <p style={{ color: colors.textSubtle }}>© 2024 VoiceoverStudioFinder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

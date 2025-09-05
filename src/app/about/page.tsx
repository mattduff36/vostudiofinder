'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { colors } from '../../components/home/HomePage';

export default function AboutPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920.jpg"
          alt="About page background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-white py-20 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0">
          <Image
            src="/bakground-images/21920-4.jpg"
            alt="Hero background texture"
            fill
            className="object-cover opacity-40"
            priority={false}
          />
        </div>
        {/* Red gradient overlay */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${colors.primary}e6, ${colors.primary}cc)` }}></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Us</h1>
          <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
          <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: 'rgba(255, 255, 255, 0.9)' }}>
            Connecting voice professionals with recording studios worldwide
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative z-10 py-16">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* How It Works Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold text-red-600 mb-6">How it works</h2>
              <div className="text-lg leading-relaxed space-y-4">
                <p>
                  Described recently as the <strong>Airbnb of Voiceover Studios</strong>.
                </p>
                <p>
                  Need a studio quickly? Have an artist who needs a studio locally?<br/>
                  Do you have a great setup that could be making you extra money?<br/>
                  As a voiceover, allow other Voiceovers to use your studio.<br/>
                  Production facility or recording studio? Get listed and get found.<br/>
                  Set your fee, add demos and pictures and weblinks.<br/>
                  Enquiries arrive with name, number and request.<br/>
                  <strong>YOU decide if you are available. We take no commission</strong>
                </p>
              </div>
            </div>
            <div className="flex justify-center items-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-lg">
                <div className="w-full h-64 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${colors.primary}20, ${colors.primary}30)` }}>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: colors.primary }}>
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-primary-800">Studio Connection</h3>
                    <p className="text-primary-600 mt-2">Find and connect with studios worldwide</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List Your Studio Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="flex justify-center items-center order-2 lg:order-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-lg">
                <div className="w-full h-64 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">List Your Studio</h3>
                    <p className="text-green-600 mt-2">Share your space with the community</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold text-red-600 mb-6">Want to list your studio?</h2>
              <div className="text-lg leading-relaxed space-y-4">
                <p>Create an account and profile.<br/>
                List your town or city and country.<br/>
                Add some pictures and a custom banner.<br/>
                Set your fees and add your social media links.<br/>
                List your connections. Source Connect, Cleanfeed, Zoom etc?<br/>
                Give a brief description, inc. mic type, kit, parking, editing services etc.<br/>
                Add your address or just a city or town if you prefer.<br/>
                Add your website to create a quality backlink to your own site.</p>
              </div>
            </div>
          </div>

          {/* Why Choose Us Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-12 shadow-lg">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-primary-800 mb-4">Why Choose VoiceoverStudioFinder?</h2>
              <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-primary-800 mb-2">No Commission</h3>
                <p className="text-gray-600">We don't take any commission from your bookings. Keep 100% of what you earn.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-primary-800 mb-2">Global Reach</h3>
                <p className="text-gray-600">Connect with studios and voice artists from around the world.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-primary-800 mb-2">Full Control</h3>
                <p className="text-gray-600">You decide your availability, rates, and who you work with.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

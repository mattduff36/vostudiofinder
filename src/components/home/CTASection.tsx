'use client';

import { Session } from 'next-auth';
import { Button } from '@/components/ui/Button';
import { Mic, Building, Users } from 'lucide-react';
import Image from 'next/image';

interface CTASectionProps {
  session: Session | null;
}

export function CTASection({ session }: CTASectionProps) {
  return (
    <div className="relative py-16 overflow-hidden">
      {/* Background Banner Image */}
      <div className="absolute inset-0">
        <Image
          src="/bottom-banner.jpg"
          alt="Professional recording studio"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800/90 to-primary-600/90"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center text-white mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            Whether you're a voice artist looking for the perfect studio or a studio owner 
            wanting to connect with talent, VoiceoverStudioFinder has you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* For Voice Artists */}
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">For Voice Artists</h3>
            <ul className="text-primary-100 space-y-2 text-sm">
              <li>• Find studios near you or worldwide</li>
              <li>• Compare equipment and services</li>
              <li>• Read reviews from other artists</li>
              <li>• Book sessions directly with studios</li>
            </ul>
          </div>

          {/* For Studio Owners */}
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">For Studio Owners</h3>
            <ul className="text-primary-100 space-y-2 text-sm">
              <li>• Reach thousands of voice artists worldwide</li>
              <li>• Professional listing with photos & details</li>
              <li>• Direct bookings from qualified clients</li>
              <li>• Only £25/year - exceptional value</li>
            </ul>
          </div>

          {/* For Everyone */}
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">For Everyone</h3>
            <ul className="text-primary-100 space-y-2 text-sm">
              <li>• Join a global community</li>
              <li>• Network with professionals</li>
              <li>• Share experiences and tips</li>
              <li>• Stay updated on industry trends</li>
            </ul>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {session ? (
            <>
              <Button
                onClick={() => window.location.href = '/studios'}
                className="bg-white text-primary-800 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              >
                Browse Studios
              </Button>
              <Button
                onClick={() => window.location.href = '/studio/create'}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary-800 px-8 py-3 text-lg font-semibold"
              >
                Add Your Studio
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => window.location.href = '/auth/signup'}
                className="bg-white text-primary-800 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              >
                List Your Studio - £25/year
              </Button>
              <Button
                onClick={() => window.location.href = '/studios'}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary-800 px-8 py-3 text-lg font-semibold"
              >
                Browse Studios
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

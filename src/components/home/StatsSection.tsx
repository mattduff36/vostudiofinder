'use client';

import { Building, Users, Star, Globe } from 'lucide-react';
import Image from 'next/image';

interface StatsSectionProps {
  stats: {
    totalStudios: number;
    totalUsers: number;
  };
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <div className="relative py-16 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-7.jpg"
          alt="Stats background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Trusted by Voice Professionals Worldwide
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Join thousands of voice artists and studio owners who use VoiceoverStudioFinder 
            to connect and collaborate on projects.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-2">
              {stats.totalStudios.toLocaleString()}+
            </div>
            <div className="text-text-secondary">Recording Studios</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-accent-600" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-2">
              {stats.totalUsers.toLocaleString()}+
            </div>
            <div className="text-text-secondary">Registered Users</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-2">
              50+
            </div>
            <div className="text-text-secondary">Countries</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-text-primary mb-2">
              24/7
            </div>
            <div className="text-text-secondary">Global Access</div>
          </div>
        </div>
      </div>
    </div>
  );
}

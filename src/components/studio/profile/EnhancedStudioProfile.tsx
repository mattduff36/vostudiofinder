'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cleanDescription } from '@/lib/utils/text';
import { colors } from '../../home/HomePage';

import { FixedDynamicGallery } from './FixedDynamicGallery';
import { ContactStudio } from './ContactStudio';
import { 
  MapPin, 
  Star, 
  Users, 
  Globe, 
  Phone, 
  Mail, 
  Crown,
  Share2,
  Clock,
  CheckCircle,
  Mic,
  Award,
  Shield
} from 'lucide-react';

interface EnhancedStudioProfileProps {
  studio: {
    id: string;
    name: string;
    description: string;
    studioType: string;
    address: string;
    websiteUrl?: string;
    phone?: string;
    isPremium: boolean;
    isVerified: boolean;
    latitude?: number;
    longitude?: number;
    images: Array<{
      id: string;
      imageUrl: string;
      altText?: string;
      sortOrder: number;
    }>;
    services: Array<{
      service: string;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      createdAt: Date;
      reviewer: {
        displayName: string;
      };
    }>;
    owner: {
      id: string;
      displayName: string;
      username: string;
      role: string;
      avatarUrl?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    averageRating: number;
    _count: {
      reviews: number;
    };
  };
}

export function EnhancedStudioProfile({ studio }: EnhancedStudioProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');


  // Key features for the studio
  const keyFeatures = [
    'Professional home studio setup',
    'Quick turnaround times - typically 24-48 hours',
    'Multiple revision rounds included',
    'Commercial and non-commercial usage rights',
    'Full range of British accents',
    'Over 8 years of experience'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h1 className="text-4xl font-bold text-gray-900">{studio.name}</h1>
                  {studio.isPremium && (
                    <Crown className="w-8 h-8 text-yellow-500" aria-label="Premium Studio" />
                  )}
                  {studio.isVerified && (
                    <div className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium flex items-center">
                      <Shield className="w-4 h-4 mr-1" />
                      Verified
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-4">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-lg">{studio.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-lg capitalize">{studio.studioType.toLowerCase().replace('_', ' ')} Studio</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="inline-block">
                    <span className="text-2xl font-bold" style={{ color: colors.primary }}>Professional Voiceover Services</span>
                    <p className="text-gray-500 text-sm mt-1">Competitive rates • Quick turnaround</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6 lg:mt-0 lg:ml-6">
                <Button
                  variant="outline"
                  className="inline-flex items-center"
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  style={{
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Get Quote
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-8 py-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-base transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-2 px-1 border-b-2 font-medium text-base transition-all duration-200 ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reviews ({studio._count.reviews})
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-2 px-1 border-b-2 font-medium text-base transition-all duration-200 ${
                activeTab === 'contact'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contact
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Image Gallery - Rightmove Style - Full Width */}
            {studio.images.length > 0 && (
              <div className="w-full -mx-4 sm:-mx-6 lg:-mx-8">
                <FixedDynamicGallery images={studio.images} />
              </div>
            )}

            {/* Studio Owner Section - Facebook-style Profile */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center space-x-6">
                  {studio.owner.avatarUrl ? (
                    <img
                      src={studio.owner.avatarUrl}
                      alt={studio.owner.displayName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                      <Users className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{studio.owner.displayName}</h2>
                    <p className="text-gray-600 text-lg">@{studio.owner.username}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={{ 
                          backgroundColor: `${colors.primary}15`, 
                          color: colors.primary 
                        }}
                      >
                        {studio.owner.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {studio.isVerified && (
                        <span className="inline-flex items-center text-sm text-green-600 font-medium">
                          <Shield className="w-4 h-4 mr-1" />
                          Verified Owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - 2/3 width */}
              <div className="lg:col-span-2 space-y-8">
                {/* Key Features - Inspired by Rightmove */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {keyFeatures.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Services Offered</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studio.services.map((service, index) => (
                      <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <Mic className="w-5 h-5 text-blue-600 mr-3" />
                        <span className="text-gray-800 font-medium">{service.service}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Studio</h2>
                  <div className="prose max-w-none text-gray-700">
                    {cleanDescription(studio.description).split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="mb-4 leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar - 1/3 width */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  {/* Quick Contact */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-4">
                      {studio.websiteUrl && (
                        <a
                          href={studio.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Globe className="w-5 h-5 text-blue-600 mr-3" />
                          <span className="text-gray-700">Visit Website</span>
                        </a>
                      )}
                      {studio.phone && (
                        <a
                          href={`tel:${studio.phone}`}
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Phone className="w-5 h-5 text-green-600 mr-3" />
                          <span className="text-gray-700">{studio.phone}</span>
                        </a>
                      )}
                      <button
                        onClick={() => setActiveTab('contact')}
                        className="w-full flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Mail className="w-5 h-5 mr-3" />
                        Send Message
                      </button>
                    </div>
                  </div>

                  {/* Studio Stats */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Studio Information</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Studio Type</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {studio.studioType.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Experience</span>
                        <span className="font-medium text-gray-900">8+ Years</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Turnaround</span>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-green-500 mr-1" />
                          <span className="font-medium text-gray-900">24-48h</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Reviews</span>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="font-medium text-gray-900">
                            {studio.averageRating > 0 ? studio.averageRating.toFixed(1) : 'New'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="p-8 text-center text-gray-500">
            Reviews section coming soon
          </div>
        )}

        {activeTab === 'contact' && (
          <ContactStudio studio={studio} />
        )}
      </div>
    </div>
  );
}
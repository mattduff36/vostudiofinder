'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { cleanDescription } from '@/lib/utils/text';
import { colors } from '../../home/HomePage';

import { StudioGallery } from './StudioGallery';
import { StudioInfo } from './StudioInfo';
import { StudioReviews } from './StudioReviews';
import { ContactStudio } from './ContactStudio';
import { 
  MapPin, 
  Star, 
  Users, 
  Globe, 
  Phone, 
  Mail, 
  Crown,
  Edit,
  Share2 
} from 'lucide-react';

interface StudioProfileProps {
  studio: {
    id: string;
    name: string;
    description: string;
    studio_type: string;
    studioTypes?: Array<{ studio_type: string }>;
    address: string;
    website_url?: string;
    phone?: string;
    is_premium: boolean;
    is_verified: boolean;
    latitude?: number;
    longitude?: number;
    created_at: Date;
    updated_at: Date;
    owner: {
      id: string;
      display_name: string;
      username: string;
      avatar_url?: string;
      role: string;
    };
    services: Array<{ service: string }>;
    images: Array<{
      id: string;
      imageUrl: string;
      alt_text?: string;
      sort_order: number;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      content: string;
      isAnonymous: boolean;
      created_at: Date;
      reviewer: {
        display_name: string;
        avatar_url?: string;
      };
    }>;
    _count: { reviews: number };
    averageRating: number;
  };
}

export function StudioProfile({ studio }: StudioProfileProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'contact'>('overview');
  
  const isOwner = session?.user?.id === studio.owner.id;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: studio.name,
          text: studio.description,
          url: window.location.href,
        });
      } catch (_) {
        console.log('Sharing cancelled');
      }
    } else {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Studio profile background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      
      {/* Studio Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ color: colors.textPrimary }}>{studio.name}</h1>
                {studio.is_premium && (
                  <Crown className="w-6 h-6 text-yellow-500" aria-label="Premium Studio" />
                )}
                {studio.is_verified && (
                  <div className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                    ✓ Verified
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm mb-4" style={{ color: colors.textSecondary }}>
                <span className="inline-block px-3 py-1 font-medium rounded" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                  {studio.studio_type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{studio.address}</span>
                </div>

                {studio.averageRating > 0 && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="font-medium">{studio.averageRating.toFixed(1)}</span>
                    <span className="ml-1">({studio._count.reviews} reviews)</span>
                  </div>
                )}
              </div>

              <p className="text-text-secondary max-w-3xl">{cleanDescription(studio.description)}</p>
            </div>

            <div className="flex items-center space-x-3 mt-6 lg:mt-0 lg:ml-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => window.location.href = `/${studio.owner.username}/edit`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Studio
                </Button>
              )}

              {!isOwner && (
                <Button
                  size="sm"
                  onClick={() => setActiveTab('contact')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Studio
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'reviews', label: `Reviews (${studio._count.reviews})` },
              { id: 'contact', label: 'Contact' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200"
                style={{
                  borderBottomColor: activeTab === tab.id ? colors.primary : 'transparent',
                  color: activeTab === tab.id ? colors.primary : colors.textSecondary
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = colors.textPrimary;
                    e.currentTarget.style.borderBottomColor = '#d1d5db';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = colors.textSecondary;
                    e.currentTarget.style.borderBottomColor = 'transparent';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              {studio.images.length > 0 && (
                <StudioGallery images={studio.images} />
              )}

              {/* Studio Information */}
              <StudioInfo studio={studio} />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Owner Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium mb-4" style={{ color: colors.textPrimary }}>Studio Owner</h3>
                  <div className="flex items-center space-x-3">
                    {studio.owner.avatar_url ? (
                      <img
                        src={studio.owner.avatar_url}
                        alt={studio.owner.display_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>{studio.owner.display_name}</p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>@{studio.owner.username}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Contact */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-medium mb-4" style={{ color: colors.textPrimary }}>Quick Contact</h3>
                  <div className="space-y-3">
                    {studio.website_url && (
                      <a
                        href={studio.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm transition-colors"
                        style={{ color: colors.textSecondary }}
                        onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                      >
                        <Globe className="w-4 h-4 mr-3" />
                        Visit Website
                      </a>
                    )}
                    {studio.phone && (
                      <a
                        href={`tel:${studio.phone}`}
                        className="flex items-center text-sm transition-colors"
                        style={{ color: colors.textSecondary }}
                        onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                      >
                        <Phone className="w-4 h-4 mr-3" />
                        {studio.phone}
                      </a>
                    )}
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="flex items-center text-sm transition-colors"
                      style={{ color: colors.textSecondary }}
                      onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                      onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                    >
                      <Mail className="w-4 h-4 mr-3" />
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <StudioReviews 
            studio={studio} 
            canReview={!!session && !isOwner}
          />
        )}

        {activeTab === 'contact' && (
          <ContactStudio studio={studio} />
        )}
      </div>
    </div>
  );
}

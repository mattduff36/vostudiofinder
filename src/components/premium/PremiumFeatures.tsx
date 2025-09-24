'use client';

import React from 'react';
import { User, Studio, UserProfile } from '@prisma/client';
import { 
  Star, 
  Crown, 
  Zap, 
  TrendingUp, 
  Eye, 
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

interface PremiumUser extends User {
  profile?: UserProfile | null;
  studios?: { id: string; name: string; studioType: string }[];
}

interface PremiumFeaturesProps {
  featuredUsers: PremiumUser[];
  spotlightUsers: PremiumUser[];
  premiumStudios: (Studio & { owner: PremiumUser })[];
  premiumStats: {
    totalFeatured: number;
    totalSpotlight: number;
    totalPremiumStudios: number;
    averageViews: number;
  };
}

export function PremiumFeatures({ 
  featuredUsers, 
  spotlightUsers, 
  premiumStudios,
  premiumStats 
}: PremiumFeaturesProps) {
  
  const PremiumUserCard = ({ user, type }: { user: PremiumUser; type: 'featured' | 'spotlight' }) => {
    const isSpotlight = type === 'spotlight';
    
    return (
      <div className={`relative bg-white rounded-lg border-2 p-4 hover:shadow-lg transition-all duration-300 ${
        isSpotlight 
          ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50' 
          : 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50'
      }`}>
        {/* Premium Badge */}
        <div className="absolute -top-2 -right-2">
          <div className={`p-2 rounded-full ${
            isSpotlight ? 'bg-purple-500' : 'bg-yellow-500'
          } text-white shadow-lg`}>
            {isSpotlight ? <Sparkles className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          </div>
        </div>

        <div className="flex items-start space-x-4">
          {/* Avatar with Premium Ring */}
          <div className="relative flex-shrink-0">
            <div className={`p-1 rounded-full ${
              isSpotlight 
                ? 'bg-gradient-to-r from-purple-400 to-pink-400' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-400'
            }`}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full bg-white p-0.5"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-600">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.profile?.studioName && user.profile?.lastName 
                    ? `${user.profile.studioName} ${user.profile.lastName}`
                    : user.displayName
                  }
                </h3>
                <p className="text-sm text-gray-600">@{user.username}</p>
                
                {/* Premium Status */}
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isSpotlight 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isSpotlight ? (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Spotlight Member
                      </>
                    ) : (
                      <>
                        <Star className="w-3 h-3 mr-1" />
                        Featured Professional
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            {user.profile?.location && (
              <p className="text-sm text-gray-500 mt-2 text-center">{user.profile.location}</p>
            )}

            {/* Short Bio */}
            {user.profile?.shortAbout && (
              <p className="text-sm text-gray-700 mt-2 line-clamp-2 text-center">
                {user.profile.shortAbout}
              </p>
            )}

            {/* Studios Count */}
            {user.studios && user.studios.length > 0 && (
              <div className="flex items-center mt-2 text-sm text-gray-600">
                <Crown className="w-4 h-4 mr-1" />
                <span>{user.studios.length} Professional Studio{user.studios.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Premium Benefits */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                <TrendingUp className="w-3 h-3 mr-1" />
                Priority Listing
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                <Eye className="w-3 h-3 mr-1" />
                Enhanced Visibility
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PremiumStudioCard = ({ studio }: { studio: Studio & { owner: PremiumUser } }) => (
    <div className="relative bg-white rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 hover:shadow-lg transition-all duration-300">
      {/* Premium Badge */}
      <div className="absolute -top-2 -right-2">
        <div className="p-2 rounded-full bg-blue-500 text-white shadow-lg">
          <Crown className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{studio.name}</h3>
            <p className="text-sm text-gray-600">
              {studio.studioType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Studio
            </p>
          </div>
          
          <div className="flex space-x-1">
            {studio.isPremium && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </span>
            )}
            {studio.isVerified && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Owner Info */}
        <div className="flex items-center space-x-2">
          {studio.owner.avatarUrl && (
            <img
              src={studio.owner.avatarUrl}
              alt={studio.owner.displayName}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-sm text-gray-600">
            Owned by {studio.owner.displayName}
          </span>
        </div>

        {/* Location */}
        {studio.address && (
          <p className="text-sm text-gray-500 truncate">{studio.address}</p>
        )}

        {/* Premium Benefits */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            <TrendingUp className="w-3 h-3 mr-1" />
            Top Results
          </span>
          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            <BarChart3 className="w-3 h-3 mr-1" />
            Analytics
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Premium Stats Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Crown className="w-6 h-6 mr-2" />
              Premium Community
            </h1>
            <p className="text-primary-100 mt-1">
              Discover our featured professionals and premium studios
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{premiumStats.totalFeatured}</div>
              <div className="text-xs text-primary-200">Featured</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{premiumStats.totalSpotlight}</div>
              <div className="text-xs text-primary-200">Spotlight</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{premiumStats.totalPremiumStudios}</div>
              <div className="text-xs text-primary-200">Premium Studios</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{premiumStats.averageViews}%</div>
              <div className="text-xs text-primary-200">More Visibility</div>
            </div>
          </div>
        </div>
      </div>

      {/* Spotlight Members */}
      {spotlightUsers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-purple-500" />
                Spotlight Members
              </h2>
              <p className="text-gray-600 mt-1">
                Our most distinguished professionals with maximum visibility
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 text-purple-600 hover:text-purple-700 font-medium">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spotlightUsers.slice(0, 6).map((user) => (
              <PremiumUserCard key={user.id} user={user} type="spotlight" />
            ))}
          </div>
        </section>
      )}

      {/* Featured Professionals */}
      {featuredUsers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Star className="w-6 h-6 mr-2 text-yellow-500" />
                Featured Professionals
              </h2>
              <p className="text-gray-600 mt-1">
                Recognized experts in the voiceover industry
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 text-yellow-600 hover:text-yellow-700 font-medium">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredUsers.slice(0, 6).map((user) => (
              <PremiumUserCard key={user.id} user={user} type="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Premium Studios */}
      {premiumStudios.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Crown className="w-6 h-6 mr-2 text-blue-500" />
                Premium Studios
              </h2>
              <p className="text-gray-600 mt-1">
                Top-tier recording facilities with premium features
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {premiumStudios.slice(0, 6).map((studio) => (
              <PremiumStudioCard key={studio.id} studio={studio} />
            ))}
          </div>
        </section>
      )}

      {/* Premium Benefits Section */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Join Our Premium Community
          </h2>
          <p className="text-gray-600">
            Unlock exclusive benefits and maximize your professional visibility
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Featured Benefits */}
          <div className="bg-white rounded-lg p-6 border border-yellow-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Featured Status</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Priority in search results
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Featured badge display
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Enhanced profile visibility
                </li>
              </ul>
            </div>
          </div>

          {/* Spotlight Benefits */}
          <div className="bg-white rounded-lg p-6 border border-purple-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Spotlight Membership</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Maximum visibility boost
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Premium spotlight badge
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Exclusive networking access
                </li>
              </ul>
            </div>
          </div>

          {/* Premium Studio Benefits */}
          <div className="bg-white rounded-lg p-6 border border-blue-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Studio</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Priority booking system
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Premium listing features
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
            <Zap className="w-5 h-5 mr-2" />
            Upgrade to Premium
          </button>
        </div>
      </section>
    </div>
  );
}

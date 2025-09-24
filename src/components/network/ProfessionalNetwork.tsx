'use client';

import React, { useState } from 'react';
import { User, UserConnection, UserProfile } from '@prisma/client';
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  Star, 
  MapPin, 
  Search,
  Network,
  Award,
  Shield,
  Mic,
  Building
} from 'lucide-react';

interface NetworkUser extends User {
  profile?: UserProfile | null;
  studios?: any[];
  _count?: {
    connections: number;
    studios: number;
  };
}

interface ProfessionalNetworkProps {
  connections: (UserConnection & {
    connectedUser: NetworkUser;
  })[];
  suggestedConnections: NetworkUser[];
  networkStats: {
    totalConnections: number;
    mutualConnections: number;
    studioOwners: number;
    voiceArtists: number;
  };
}

export function ProfessionalNetwork({ 
  connections, 
  suggestedConnections,
  networkStats 
}: ProfessionalNetworkProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'discover' | 'stats'>('connections');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'studio_owners' | 'voice_artists'>('all');

  // Filter connections based on search and type
  const filteredConnections = connections.filter(conn => {
    const user = conn.connectedUser;
    const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.profile?.location && user.profile.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'studio_owners' && user.studios && user.studios.length > 0) ||
                         (filterType === 'voice_artists' && (!user.studios || user.studios.length === 0));
    
    return matchesSearch && matchesFilter;
  });

  const ConnectionCard = ({ user, isConnection = false }: { user: NetworkUser; isConnection?: boolean }) => {
    const badges = [];
    if (user.profile?.isFeatured) badges.push({ label: 'Featured', color: 'bg-yellow-100 text-yellow-800', icon: Star });
    if (user.profile?.isSpotlight) badges.push({ label: 'Spotlight', color: 'bg-purple-100 text-purple-800', icon: Award });
    if (user.profile?.isCrbChecked) badges.push({ label: 'CRB', color: 'bg-green-100 text-green-800', icon: Shield });
    if (user.studios && user.studios.length > 0) badges.push({ label: 'Studio Owner', color: 'bg-blue-100 text-blue-800', icon: Building });

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {user.profile?.studioName && user.profile?.lastName 
                    ? `${user.profile.studioName} ${user.profile.lastName}`
                    : user.displayName
                  }
                </h3>
                <p className="text-sm text-gray-500 text-center">@{user.username}</p>
              </div>
              
              {/* Connection Actions */}
              <div className="flex space-x-2">
                {isConnection ? (
                  <>
                    <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <Users className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Location */}
            {user.profile?.location && (
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{user.profile.location}</span>
              </div>
            )}

            {/* Short Bio */}
            {user.profile?.shortAbout && (
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                {user.profile.shortAbout}
              </p>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badges.map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Connection Stats */}
            {user._count && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {user._count.connections} connections
                </span>
                {user._count.studios > 0 && (
                  <span className="flex items-center">
                    <Building className="w-3 h-3 mr-1" />
                    {user._count.studios} studios
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Network className="w-6 h-6 mr-2" />
              Professional Network
            </h1>
            <p className="text-primary-100 mt-1">
              Connect with voiceover professionals and studio owners worldwide
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{networkStats.totalConnections}</div>
              <div className="text-xs text-primary-200">Connections</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{networkStats.studioOwners}</div>
              <div className="text-xs text-primary-200">Studio Owners</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'connections', label: 'My Network', count: connections.length },
            { id: 'discover', label: 'Discover', count: suggestedConnections.length },
            { id: 'stats', label: 'Network Insights', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search your network..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Connections</option>
                <option value="studio_owners">Studio Owners</option>
                <option value="voice_artists">Voice Artists</option>
              </select>
            </div>

            {/* Connections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  user={connection.connectedUser}
                  isConnection={true}
                />
              ))}
            </div>

            {filteredConnections.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'Start building your professional network'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Discover New Connections</h2>
              <p className="text-gray-600">Connect with professionals in the voiceover industry</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestedConnections.map((user) => (
                <ConnectionCard
                  key={user.id}
                  user={user}
                  isConnection={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Network Insights Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Network Insights</h2>
              <p className="text-gray-600">Understand your professional network</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">{networkStats.totalConnections}</div>
                <div className="text-sm text-blue-700">Total Connections</div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-900">{networkStats.studioOwners}</div>
                <div className="text-sm text-green-700">Studio Owners</div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <Mic className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-900">{networkStats.voiceArtists}</div>
                <div className="text-sm text-purple-700">Voice Artists</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <Network className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-900">{networkStats.mutualConnections}</div>
                <div className="text-sm text-yellow-700">Mutual Connections</div>
              </div>
            </div>

            {/* Network Growth Chart Placeholder */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Network Growth</h3>
              <div className="h-48 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Network className="w-12 h-12 mx-auto mb-2" />
                  <p>Network analytics coming soon</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { GoogleMap } from './GoogleMap';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MapLocation, geocodeAddress, getCurrentLocation } from '@/lib/maps';
import { MapPin, Navigation, Search } from 'lucide-react';
import { showError, showWarning } from '@/lib/toast';

interface LocationPickerProps {
  initialLocation?: MapLocation;
  onLocationChange: (location: MapLocation & { address?: string }) => void;
  className?: string;
}

export function LocationPicker({
  initialLocation = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  onLocationChange,
  className = '',
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation>(initialLocation);
  const [address, setAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleLocationSelect = useCallback((location: MapLocation) => {
    setSelectedLocation(location);
    onLocationChange({ ...location, address });
  }, [address, onLocationChange]);

  const handleAddressSearch = async () => {
    if (!address.trim()) return;

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(address);
      if (result) {
        const newLocation = { lat: result.lat, lng: result.lng };
        setSelectedLocation(newLocation);
        setAddress(result.address);
        onLocationChange({ ...newLocation, address: result.address });
      } else {
        showWarning('Address not found. Please try a different address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      showError('Error searching for address. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setSelectedLocation(location);
      onLocationChange({ ...location, address });
    } catch (error) {
      console.error('Geolocation error:', error);
      showError('Unable to get your current location. Please ensure location permissions are enabled.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Address Search */}
      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            placeholder="Enter studio address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
          />
        </div>
        <Button
          type="button"
          onClick={handleAddressSearch}
          loading={isGeocoding}
          disabled={isGeocoding || !address.trim()}
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleGetCurrentLocation}
          loading={isGettingLocation}
          disabled={isGettingLocation}
        >
          <Navigation className="w-4 h-4 mr-2" />
          Use Current
        </Button>
      </div>

      {/* Map */}
      <div className="relative">
        <GoogleMap
          center={selectedLocation}
          zoom={15}
          markers={[
            {
              id: 'selected',
              position: selectedLocation,
              title: 'Studio Location',
            },
          ]}
          onLocationSelect={handleLocationSelect}
          height="300px"
          className="border border-gray-300 rounded-lg"
        />
        
        {/* Location Info Overlay */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center text-sm text-text-primary">
            <MapPin className="w-4 h-4 mr-2 text-primary-600" />
            <div>
              <div className="font-medium">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
              {address && (
                <div className="text-xs text-text-secondary mt-1">{address}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-text-secondary bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-900 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="font-medium text-blue-900">How to set your studio location:</p>
        </div>
        <ul className="space-y-1 text-blue-800 ml-6">
          <li>• Search for your address in the field above</li>
          <li>• Click "Use Current" to use your current location</li>
          <li>• Click on the map to manually select a location</li>
          <li>• Drag the marker to fine-tune the position</li>
        </ul>
      </div>
    </div>
  );
}

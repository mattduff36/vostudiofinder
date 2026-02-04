'use client';

import { useState, useEffect } from 'react';
import { Gift, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';

interface PromoToggleProps {
  initialState?: boolean;
}

export function PromoToggle({ initialState }: PromoToggleProps) {
  const [isActive, setIsActive] = useState(initialState ?? false);
  const [isLoading, setIsLoading] = useState(!initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  // Fetch initial state on mount if not provided
  useEffect(() => {
    if (initialState === undefined) {
      fetchPromoState();
    }
  }, [initialState]);

  const fetchPromoState = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/promo-settings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch promo settings');
      }
      
      const data = await response.json();
      setIsActive(data.isActive);
    } catch (err) {
      setError('Failed to load promo settings');
      console.error('Error fetching promo settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    const newState = !isActive;
    setIsSaving(true);
    setError(null);
    
    // Optimistically update UI
    setIsActive(newState);
    
    try {
      const response = await fetch('/api/admin/promo-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newState }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update promo settings');
      }
      
      const data = await response.json();
      setIsActive(data.isActive);
      
      // Show saved indicator
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (err) {
      // Revert on error
      setIsActive(!newState);
      setError('Failed to update promo settings');
      console.error('Error updating promo settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 border-2 transition-colors ${
      isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
            <Gift className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                Free Signup Promo
              </h3>
              {showSaved && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {isActive ? (
                <span className="text-green-700 font-medium">Active — New signups are FREE</span>
              ) : (
                <span>Disabled — Normal £25/year pricing</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          {isSaving && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
          <Toggle
            checked={isActive}
            onChange={handleToggle}
            disabled={isSaving}
          />
        </div>
      </div>
      
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={fetchPromoState}
            className="underline hover:no-underline ml-1"
          >
            Retry
          </button>
        </div>
      )}
      
      {isActive && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-700">
            🎉 Flash sale is live! New users can sign up for free (normally £25/year).
          </p>
        </div>
      )}
    </div>
  );
}

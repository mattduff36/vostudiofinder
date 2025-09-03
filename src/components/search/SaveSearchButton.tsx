'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface SaveSearchButtonProps {
  searchParams: {
    location?: string;
    radius?: number;
    services?: string[];
    studioType?: string;
    minRating?: number;
  };
  onSave?: () => void;
}

export function SaveSearchButton({ searchParams, onSave }: SaveSearchButtonProps) {
  const { data: session } = useSession();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveSearch = async () => {
    if (!session) {
      // Redirect to login or show login modal
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Search in ${searchParams.location || 'All Locations'}`,
          filters: searchParams,
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        onSave?.();
      }
    } catch (error) {
      console.error('Failed to save search:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <Button
      onClick={handleSaveSearch}
      disabled={isLoading || isSaved}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      {isLoading ? 'Saving...' : isSaved ? 'Saved' : 'Save Search'}
    </Button>
  );
}

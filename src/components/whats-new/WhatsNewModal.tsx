'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { PlatformUpdateCategory } from '@prisma/client';

interface PlatformUpdate {
  id: string;
  title: string | null;
  description: string;
  category: PlatformUpdateCategory;
  release_date: string;
  is_highlighted: boolean;
}

function formatReleaseDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${day}${suffix}, ${year}`;
}

function getCategoryLabel(category: PlatformUpdateCategory): string {
  const labels: Record<PlatformUpdateCategory, string> = {
    FEATURE: 'New Features',
    IMPROVEMENT: 'Improvements',
    FIX: 'Fixes',
    SECURITY: 'Security',
  };
  return labels[category];
}

function getCategoryBadgeClass(category: PlatformUpdateCategory): string {
  const classes: Record<PlatformUpdateCategory, string> = {
    FEATURE: 'bg-emerald-100 text-emerald-800',
    IMPROVEMENT: 'bg-blue-100 text-blue-800',
    FIX: 'bg-amber-100 text-amber-800',
    SECURITY: 'bg-red-100 text-red-800',
  };
  return classes[category];
}

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/platform-updates')
        .then((res) => res.json())
        .then((data) => {
          setUpdates(data.updates || []);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const groupedByDate = updates.reduce<Record<string, PlatformUpdate[]>>((acc, update) => {
    const dateKey = update.release_date.split('T')[0] ?? update.release_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(update);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => (a > b ? -1 : 1));

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="flex flex-col h-full sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between p-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#d42027]" aria-hidden />
              What&apos;s New at Voiceover Studio Finder
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              We&apos;re constantly improving the platform to help studios get more bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : updates.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No updates yet. Check back soon!</p>
          ) : (
            <div className="space-y-8">
              {sortedDates.map((dateKey) => {
                const dateUpdates = groupedByDate[dateKey] ?? [];
                const dateStr = dateUpdates[0]?.release_date ?? dateKey;
                return (
                  <section key={dateKey}>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      {formatReleaseDate(dateStr)}
                    </h3>
                    <div className="space-y-4">
                      {dateUpdates.map((update) => (
                        <div
                          key={update.id}
                          className={`rounded-lg p-4 ${update.is_highlighted ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeClass(update.category)}`}
                            >
                              {getCategoryLabel(update.category)}
                            </span>
                            {update.title && (
                              <span className="text-sm font-medium text-gray-700">{update.title}</span>
                            )}
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {update.description
                              .split('\n')
                              .filter((line) => line.trim())
                              .map((line, i) => (
                                <li key={i}>{line.trim()}</li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

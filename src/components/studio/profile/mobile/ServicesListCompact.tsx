/**
 * ServicesListCompact - Compact Services Display for Mobile
 * 
 * Horizontal scrollable chip list
 * Max 10 services visible, rest in "+X more"
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface ServicesListCompactProps {
  services: Array<{ service: string }>;
}

export function ServicesListCompact({ services }: ServicesListCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Phase 3 feature gate

  if (services.length === 0) {
    return null;
  }

  const visibleServices = isExpanded ? services : services.slice(0, 6);
  const hasMore = services.length > 6;

  return (
    <div className="md:hidden bg-white p-4 border-b border-gray-200">
      <p className="text-xs text-gray-500 mb-3">Services Offered</p>

      {/* Services Grid */}
      <div className="grid grid-cols-2 gap-2">
        {visibleServices.map((service, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 text-sm text-gray-700"
          >
            <CheckCircle2 className="w-4 h-4 text-[#d42027] flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{service.service}</span>
          </div>
        ))}
      </div>

      {/* Show More / Show Less Button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center justify-center w-full py-2 text-sm font-medium text-[#d42027] hover:bg-gray-50 rounded-lg transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              <span>Show less</span>
              <ChevronUp className="w-4 h-4 ml-1" aria-hidden="true" />
            </>
          ) : (
            <>
              <span>Show all ({services.length} services)</span>
              <ChevronDown className="w-4 h-4 ml-1" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

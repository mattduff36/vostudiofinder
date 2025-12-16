/**
 * AboutCollapsible - Collapsible About Section for Mobile
 * 
 * Shows essential studio information:
 * - Location
 * - Description (first 3 lines, expandable)
 * - Equipment list (collapsible)
 * - Studio types
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';
import { cleanDescription } from '@/lib/utils/text';

interface AboutCollapsibleProps {
  location?: string | undefined;
  city?: string | undefined;
  about?: string | undefined;
  equipmentList?: string | null | undefined;
  studioTypes: string[];
  showAddress?: boolean | null | undefined;
}

export function AboutCollapsible({
  location,
  city,
  about,
  equipmentList,
  studioTypes,
  showAddress = true,
}: AboutCollapsibleProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(false);

  // Phase 3 feature gate
  if (!isMobileFeatureEnabled(3)) {
    return null;
  }

  const description = about ? cleanDescription(about) : '';
  const displayLocation = city || location || 'Location not specified';
  
  // Respect show_address privacy setting (show only if not explicitly false)
  const shouldShowAddress = showAddress !== false;

  // Check if description is long enough to need expansion
  const descriptionLines = description.split('\n');
  const needsExpansion = descriptionLines.length > 3 || description.length > 200;
  const shortDescription = needsExpansion
    ? descriptionLines.slice(0, 3).join('\n').substring(0, 200) + '...'
    : description;

  return (
    <div className="md:hidden bg-white border-b border-gray-200">
      {/* Location - Only show if show_address is not false */}
      {shouldShowAddress && location && (
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-gray-700">
            <MapPin className="w-4 h-4 text-[#d42027] flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">{displayLocation}</span>
          </div>
        </div>
      )}

      {/* Studio Types */}
      {studioTypes.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Studio Type</p>
          <div className="flex flex-wrap gap-2">
            {studioTypes.map((type, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#d42027]/10 text-[#d42027]"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* About Description */}
      {description && (
        <div className="px-4 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {isDescriptionExpanded ? description : shortDescription}
          </div>
          {needsExpansion && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="mt-2 flex items-center text-sm font-medium text-[#d42027] hover:text-[#a1181d]"
              aria-expanded={isDescriptionExpanded}
            >
              {isDescriptionExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-4 h-4 ml-1" aria-hidden="true" />
                </>
              ) : (
                <>
                  <span>Read more</span>
                  <ChevronDown className="w-4 h-4 ml-1" aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Equipment List */}
      {equipmentList && (
        <div className="px-4 py-4 border-b border-gray-100">
          <button
            onClick={() => setIsEquipmentExpanded(!isEquipmentExpanded)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={isEquipmentExpanded}
          >
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-gray-900">Equipment</h3>
            </div>
            {isEquipmentExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
            )}
          </button>
          {isEquipmentExpanded && (
            <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {equipmentList}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

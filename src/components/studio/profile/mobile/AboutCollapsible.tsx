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
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { cleanDescription } from '@/lib/utils/text';

interface AboutCollapsibleProps {
  about?: string | undefined;
  equipmentList?: string | null | undefined;
  studioTypes: string[];
}

export function AboutCollapsible({
  about,
  equipmentList,
  studioTypes,
}: AboutCollapsibleProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(false);

  // Phase 3 feature gate

  const description = about ? cleanDescription(about) : '';

  // Check if description is long enough to need expansion
  const descriptionLines = description.split('\n');
  const needsExpansion = descriptionLines.length > 3 || description.length > 200;
  const shortDescription = needsExpansion
    ? descriptionLines.slice(0, 3).join('\n').substring(0, 200) + '...'
    : description;

  return (
    <div className="md:hidden bg-white border-b border-gray-200">
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

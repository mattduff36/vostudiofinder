/**
 * AboutCollapsible - Collapsible About Section for Mobile
 * 
 * Shows essential studio information:
 * - Description (full text)
 * - Studio types
 * - Equipment list (collapsible)
 * - Services offered (collapsible)
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 3.
 */
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Briefcase } from 'lucide-react';
import { cleanDescription } from '@/lib/utils/text';
import { formatStudioTypeLabel } from '@/lib/utils/studio-types';

interface AboutCollapsibleProps {
  about?: string | undefined;
  equipmentList?: string | null | undefined;
  servicesOffered?: string | null | undefined;
  studioTypes: string[];
}

export function AboutCollapsible({
  about,
  equipmentList,
  servicesOffered,
  studioTypes,
}: AboutCollapsibleProps) {
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(false);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  
  // Clean equipment list and check if it has valid content after cleaning
  const cleanedEquipment = equipmentList ? cleanDescription(equipmentList) : '';
  const cleanedServices = servicesOffered ? cleanDescription(servicesOffered) : '';

  // Phase 3 feature gate

  const description = about ? cleanDescription(about) : '';

  return (
    <div className="md:hidden bg-white border-b border-gray-200">
      {/* About Description */}
      {description && (
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs !text-black !font-bold mb-2">Description</p>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
            {description}
          </div>
        </div>
      )}

      {/* Studio Types */}
      {studioTypes.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs !text-black !font-bold mb-2">Studio Type</p>
          <div className="flex flex-wrap gap-2">
            {studioTypes.map((type, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#d42027]/10 !text-[#d42027]"
              >
                {formatStudioTypeLabel(type)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Equipment List */}
      {cleanedEquipment && (
        <div className="px-4 py-4 border-b border-gray-100">
          <button
            onClick={() => setIsEquipmentExpanded(!isEquipmentExpanded)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={isEquipmentExpanded}
          >
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <p className="text-xs !text-black !font-bold">Equipment</p>
            </div>
            {isEquipmentExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
            )}
          </button>
          {isEquipmentExpanded && (
            <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
              {cleanedEquipment}
            </div>
          )}
        </div>
      )}

      {/* Services Offered */}
      {cleanedServices && (
        <div className="px-4 py-4 border-b border-gray-100">
          <button
            onClick={() => setIsServicesExpanded(!isServicesExpanded)}
            className="flex items-center justify-between w-full text-left"
            aria-expanded={isServicesExpanded}
          >
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <p className="text-xs !text-black !font-bold">Services Offered</p>
            </div>
            {isServicesExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
            )}
          </button>
          {isServicesExpanded && (
            <div className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">
              {cleanedServices}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

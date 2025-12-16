/**
 * ProfileEditMobile - Mobile-friendly profile editing interface
 * 
 * Accordion-style sections that expand/collapse on tap.
 * Similar UX to QuickActions for consistency.
 */
'use client';

import { useState } from 'react';
import { 
  User, 
  MapPin, 
  DollarSign, 
  Share2, 
  Wifi, 
  Eye, 
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { isMobileFeatureEnabled } from '@/lib/feature-flags';

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface ProfileEditMobileProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  children: React.ReactNode;
}

const SECTION_ICONS = {
  basic: { icon: User, description: 'Display name, username, studio info' },
  contact: { icon: MapPin, description: 'Phone, email, address details' },
  rates: { icon: DollarSign, description: 'Pricing and rate tiers' },
  social: { icon: Share2, description: 'Social media profiles' },
  connections: { icon: Wifi, description: 'Remote session connections' },
  privacy: { icon: Eye, description: 'Visibility preferences' },
};

export function ProfileEditMobile({ 
  sections, 
  activeSection, 
  onSectionChange,
  children 
}: ProfileEditMobileProps) {
  if (!isMobileFeatureEnabled(4)) {
    return null;
  }

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleSectionClick = (sectionId: string) => {
    if (expandedSection === sectionId) {
      // Collapse if already expanded
      setExpandedSection(null);
    } else {
      // Expand and set as active
      setExpandedSection(sectionId);
      onSectionChange(sectionId);
    }
  };

  return (
    <div className="md:hidden space-y-3 px-4 py-6">
      {sections.map((section) => {
        const iconData = SECTION_ICONS[section.id as keyof typeof SECTION_ICONS];
        const Icon = iconData?.icon || User;
        const isExpanded = expandedSection === section.id;

        return (
          <div
            key={section.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
          >
            {/* Section Header - Tappable */}
            <button
              onClick={() => handleSectionClick(section.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#d42027]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-base">
                    {section.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {iconData?.description}
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
              )}
            </button>

            {/* Section Content - Expandable */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                {children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

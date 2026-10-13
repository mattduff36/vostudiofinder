import type { CompletionBreakdown, CompletionInput } from '@/lib/utils/profile-completion';

export interface AdminStudioDetails {
  accountCreatedAt: string;
  billing: string;
  renewal: string;
  latestPayment: string | null;
  openSupport: number;
  openRefunds: number;
  note: { text: string; updatedAt: string | null; version: string | null };
}

export interface Studio extends CompletionInput {
  admin_details?: AdminStudioDetails;
  id: string;
  name: string;
  description?: string | null;
  studio_type?: string;
  studio_studio_types: Array<{ studio_type: string }>;
  studio_images: Array<{ id: string }>;
  status: string;
  is_verified: boolean;
  is_premium: boolean;
  is_featured: boolean;
  featured_until: string | null;
  is_spotlight: boolean;
  is_profile_visible: boolean;
  admin_review: boolean;
  profile_completion: number;
  completion: CompletionBreakdown;
  last_login: string | null;
  membership_expires_at: string | null;
  membership_tier: string;
  latitude: number | null;
  longitude: number | null;
  users: {
    id: string;
    display_name: string;
    email: string;
    username: string;
    email_verified: boolean;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface StudiosResponse {
  studios: Studio[];
  pagination: { total: number; hasMore: boolean; offset: number; limit: number; returned: number; maxLimit: number };
}
export interface BulkActionResult {
  status: 'success' | 'partial' | 'cancelled' | 'failed';
  processedIds: string[];
}
export const STUDIO_PAGE_SIZE = 80;
// Larger sets remain browsable in bounded windows; never concatenate snapshots.
export const STUDIO_MAX_WINDOW = 400;

export interface ColumnConfig {
  id: string;
  label: string;
  protected: boolean;
}

export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'select', label: 'Select', protected: false },
  { id: 'adminReview', label: 'Admin Review', protected: false },
  { id: 'studio', label: 'Studio', protected: true },
  { id: 'type', label: 'Type', protected: false },
  { id: 'owner', label: 'Owner', protected: false },
  { id: 'status', label: 'Status', protected: false },
  { id: 'visible', label: 'Visible', protected: false },
  { id: 'complete', label: 'Complete', protected: false },
  { id: 'verified', label: 'Verified', protected: false },
  { id: 'featured', label: 'Featured', protected: false },
  { id: 'lastLogin', label: 'Last Login', protected: false },
  { id: 'membershipExpires', label: 'Membership Expires', protected: false },
  { id: 'updated', label: 'Updated', protected: false },
  { id: 'actions', label: 'Actions', protected: true },
];

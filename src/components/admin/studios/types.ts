export interface Studio {
  id: string;
  name: string;
  description?: string;
  studio_type: string;
  studio_studio_types?: Array<{ studio_type: string }>;
  status: string;
  is_verified: boolean;
  is_premium: boolean;
  is_featured?: boolean;
  featured_until?: string | null;
  is_spotlight?: boolean;
  is_profile_visible?: boolean;
  profile_completion?: number;
  last_login?: string | null;
  membership_expires_at?: string | null;
  users: {
    display_name: string;
    email: string;
    username: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ColumnConfig {
  id: string;
  label: string;
  protected: boolean;
}

export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'select', label: 'Select', protected: false },
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

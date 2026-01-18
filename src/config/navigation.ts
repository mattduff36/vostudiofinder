/**
 * Navigation Configuration - Single Source of Truth
 * 
 * All site and account navigation items are defined here.
 * Desktop burger menus, mobile menus, and other nav components
 * consume this config to ensure consistency.
 */

import { LucideIcon, Home, Search, User, Edit, CreditCard, Settings, LogOut, Eye, LogIn, UserPlus, Shield, Pencil, HelpCircle } from 'lucide-react';

export type NavItemType = 'link' | 'action' | 'visibility-toggle';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  type: NavItemType;
  href?: string;
  action?: string;
  section: 'site' | 'account' | 'settings' | 'admin' | 'auth';
  requiresAuth?: boolean;
  adminOnly?: boolean;
  isDestructive?: boolean;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
}

/**
 * Master navigation items registry
 */
export const NAV_ITEMS: Record<string, NavItem> = {
  // Site links
  home: {
    id: 'home',
    label: 'Home',
    icon: Home,
    type: 'link',
    href: '/',
    section: 'site',
    showOnMobile: true,
    showOnDesktop: true,
  },
  studios: {
    id: 'studios',
    label: 'Browse Studios',
    icon: Search,
    type: 'link',
    href: '/studios',
    section: 'site',
    showOnMobile: true,
    showOnDesktop: true,
  },
  about: {
    id: 'about',
    label: 'About Us',
    icon: HelpCircle,
    type: 'link',
    href: '/about',
    section: 'site',
    showOnMobile: true,
    showOnDesktop: true,
  },

  // Account links (authenticated)
  overview: {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    type: 'link',
    href: '/dashboard',
    section: 'account',
    requiresAuth: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  editProfile: {
    id: 'editProfile',
    label: 'Edit Profile',
    icon: Edit,
    type: 'link',
    href: '/dashboard/edit-profile',
    section: 'account',
    requiresAuth: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  myProfile: {
    id: 'myProfile',
    label: 'My Profile',
    icon: User,
    type: 'link',
    href: '/{username}', // Will be replaced with actual username
    section: 'account',
    requiresAuth: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  membership: {
    id: 'membership',
    label: 'Membership',
    icon: CreditCard,
    type: 'link',
    href: '/dashboard/settings?section=membership',
    section: 'settings',
    requiresAuth: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  profileVisibility: {
    id: 'profileVisibility',
    label: 'Profile Visibility',
    icon: Eye,
    type: 'visibility-toggle',
    section: 'settings',
    requiresAuth: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    type: 'link',
    href: '/dashboard/settings?section=privacy',
    section: 'settings',
    requiresAuth: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  logout: {
    id: 'logout',
    label: 'Logout',
    icon: LogOut,
    type: 'action',
    action: 'logout',
    section: 'account',
    requiresAuth: true,
    isDestructive: true,
    showOnMobile: true,
    showOnDesktop: true,
  },

  // Admin links
  adminEdit: {
    id: 'adminEdit',
    label: 'EDIT',
    icon: Pencil,
    type: 'action',
    action: 'profileEditClick',
    section: 'admin',
    requiresAuth: true,
    adminOnly: true,
    showOnMobile: true,
    showOnDesktop: true,
  },
  adminPanel: {
    id: 'adminPanel',
    label: 'ADMIN',
    icon: Shield,
    type: 'link',
    href: '/admin',
    section: 'admin',
    requiresAuth: true,
    adminOnly: true,
    showOnMobile: true,
    showOnDesktop: true,
  },

  // Auth links (unauthenticated)
  signin: {
    id: 'signin',
    label: 'Sign In',
    icon: LogIn,
    type: 'link',
    href: '/auth/signin',
    section: 'auth',
    requiresAuth: false,
    showOnMobile: true,
    showOnDesktop: true,
  },
  signup: {
    id: 'signup',
    label: 'List Your Studio',
    icon: UserPlus,
    type: 'link',
    href: '/auth/signup',
    section: 'auth',
    requiresAuth: false,
    showOnMobile: true,
    showOnDesktop: true,
  },
};

export interface MenuContext {
  session: any;
  isAdminUser: boolean;
  showEditButton: boolean;
  username?: string | undefined;
  pathname?: string | undefined;
  isVisible?: boolean | undefined;
  loadingVisibility?: boolean | undefined;
  togglingVisibility?: boolean | undefined;
}

/**
 * Get menu items for desktop burger menu (authenticated users)
 */
export function getDesktopBurgerMenuItems(context: MenuContext & { includeSiteLinks?: boolean }): NavItem[] {
  const { session, username } = context;

  if (!session) {
    return [];
  }

  const items: NavItem[] = [];

  // Account links
  items.push(NAV_ITEMS.overview!);
  items.push(NAV_ITEMS.editProfile!);
  items.push({
    ...NAV_ITEMS.myProfile!,
    href: `/${username || 'profile'}`,
  });

  // Membership and settings
  items.push(NAV_ITEMS.membership!);
  items.push(NAV_ITEMS.profileVisibility!);
  items.push(NAV_ITEMS.settings!);

  // Logout
  items.push(NAV_ITEMS.logout!);

  return items;
}

/**
 * Get menu items for mobile bottom-nav menu
 * 
 * Rules:
 * - Signed in: Include site links + account links, but EXCLUDE items already in bottom nav
 * - Signed out: Show all links including duplicates
 * - Admin users: Add EDIT/ADMIN actions at the top
 */
export function getMobileMenuItems(context: MenuContext & { bottomNavIds: string[] }): NavItem[] {
  const { session, isAdminUser, showEditButton, username, bottomNavIds, pathname } = context;

  const items: NavItem[] = [];

  if (session) {
    // Signed in: Add admin actions first
    if (isAdminUser) {
      if (showEditButton) {
        items.push(NAV_ITEMS.adminEdit!);
      }
      items.push(NAV_ITEMS.adminPanel!);
    }

    // Add site links (excluding Home since logo acts as home)
    const siteLinks = [NAV_ITEMS.studios!, NAV_ITEMS.about!];
    for (const link of siteLinks) {
      // Exclude if already in bottom nav
      if (link && !bottomNavIds.includes(link.id)) {
        items.push(link);
      }
    }

    // Add account links (excluding those in bottom nav)
    const accountLinks: NavItem[] = [
      NAV_ITEMS.overview!,
      NAV_ITEMS.editProfile!,
      {
        ...NAV_ITEMS.myProfile!,
        href: `/${username || 'profile'}`,
      },
    ];

    for (const link of accountLinks) {
      // Exclude if already in bottom nav
      if (link && link.id && !bottomNavIds.includes(link.id)) {
        items.push(link);
      }
    }

    // Add Membership and Settings
    items.push(NAV_ITEMS.membership!);
    items.push(NAV_ITEMS.settings!);

    // Always add About Us (even if in bottom nav, per requirements for signed in)
    if (!items.find(item => item.id === 'about')) {
      items.push(NAV_ITEMS.about!);
    }

    // Add Sign Out
    items.push(NAV_ITEMS.logout!);

  } else {
    // Signed out: Show all links (including duplicates)
    // Don't filter by pathname for Sign In button (always show in menu)
    items.push(NAV_ITEMS.signin!);
    
    // Only show Sign Up if not on signup page
    if (pathname !== '/auth/signup') {
      items.push(NAV_ITEMS.signup!);
    }

    // Add About Us
    items.push(NAV_ITEMS.about!);
  }

  return items;
}

/**
 * Bottom nav button IDs (used for exclusion logic)
 */
export const BOTTOM_NAV_BUTTON_IDS = {
  SIGNED_IN: ['home', 'studios', 'myProfile', 'overview'],
  SIGNED_OUT: ['home', 'studios', 'signup'],
};

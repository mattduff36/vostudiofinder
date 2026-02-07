/**
 * Navigation Configuration - Single Source of Truth
 * 
 * All site and account navigation items are defined here.
 * Desktop burger menus, mobile menus, and other nav components
 * consume this config to ensure consistency.
 */

import { LucideIcon, Home, Search, User, Edit, CreditCard, Settings, LogOut, Eye, LogIn, UserPlus, Shield, HelpCircle, FileText } from 'lucide-react';

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
  help: {
    id: 'help',
    label: 'Help Center',
    icon: HelpCircle,
    type: 'link',
    href: '/help',
    section: 'site',
    showOnMobile: true,
    showOnDesktop: true,
  },
  privacy: {
    id: 'privacy',
    label: 'Privacy Policy',
    icon: FileText,
    type: 'link',
    href: '/privacy',
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
    type: 'action',
    action: 'openEditProfileModal',
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
    label: 'Log Out',
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
  const { session, username, includeSiteLinks = false } = context;

  if (!session) {
    return [];
  }

  const items: NavItem[] = [];

  // If includeSiteLinks is true (tablet view), add site navigation first
  if (includeSiteLinks) {
    items.push(NAV_ITEMS.studios!);
    items.push(NAV_ITEMS.about!);
  }

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
 * - Admin users: Add ADMIN action at the top
 */
export function getMobileMenuItems(context: MenuContext & { bottomNavIds: string[] }): NavItem[] {
  const { session, isAdminUser, username } = context;

  const items: NavItem[] = [];

  if (session) {
    // Section 1: Welcome message (non-clickable greeting since Profile is in bottom nav)
    const displayName = session.user?.display_name || username || 'User';
    items.push({
      id: 'welcome-user',
      label: `Welcome, ${displayName}`,
      icon: undefined as any,
      type: 'action' as const,
      // No href - non-clickable greeting
      section: 'site' as const,
    });

    // Section 2: Account Management (Edit Profile, Membership, Settings)
    items.push(NAV_ITEMS.editProfile!);
    items.push(NAV_ITEMS.membership!);
    items.push(NAV_ITEMS.settings!);

    // Section 3: Site Links (About, Help, Privacy)
    items.push(NAV_ITEMS.about!);
    items.push(NAV_ITEMS.help!);
    items.push(NAV_ITEMS.privacy!);

    // Section 4: Admin actions (if admin user)
    if (isAdminUser) {
      items.push(NAV_ITEMS.adminPanel!);
    }

    // Section 5: Logout (always last)
    items.push(NAV_ITEMS.logout!);

  } else {
    // Signed out: Show welcome message and navigation links
    
    // Section 1: Welcome message (no profile link for logged out)
    items.push({
      id: 'welcome-guest',
      label: 'Welcome!',
      icon: undefined as any,
      type: 'action' as const,
      // No href - non-clickable greeting
      section: 'site' as const,
    });
    
    // Section 2: About and Sign Up
    items.push(NAV_ITEMS.about!);
    items.push(NAV_ITEMS.signup!); // "List Your Studio" - will be styled in red
    
    // Section 3: Help/Legal links
    items.push(NAV_ITEMS.help!);
    items.push(NAV_ITEMS.privacy!);
  }

  return items;
}

/**
 * Bottom nav button IDs (used for exclusion logic)
 */
export const BOTTOM_NAV_BUTTON_IDS = {
  SIGNED_IN: ['home', 'studios', 'myProfile', 'overview'],
  SIGNED_OUT: ['home', 'studios'],
};

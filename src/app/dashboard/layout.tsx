import { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Dashboard - Voiceover Studio Finder',
  description: 'Private dashboard and account management for Voiceover Studio Finder.',
});

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return children;
}

import { ReactNode } from 'react';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Account Access - Voiceover Studio Finder',
  description: 'Authentication and account access for Voiceover Studio Finder.',
});

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return children;
}

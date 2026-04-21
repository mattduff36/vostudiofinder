import { HelpPageClient } from '@/app/help/help-page-client';
import { buildPublicPageMetadata } from '@/lib/seo/metadata';

export const metadata = buildPublicPageMetadata({
  title: 'Help Center - Voiceover Studio Finder',
  description:
    'Find help, FAQs, and guidance for browsing studios, listing your studio, and using Voiceover Studio Finder.',
  pathname: '/help',
});

export default function HelpPage() {
  return <HelpPageClient />;
}
import { UnauthorizedPageClient } from '@/app/unauthorized/unauthorized-page-client';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Access Denied - Voiceover Studio Finder',
  description: 'Private or restricted area on Voiceover Studio Finder.',
});

export default function UnauthorizedPage() {
  return <UnauthorizedPageClient />;
}

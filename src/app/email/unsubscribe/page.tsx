import { UnsubscribePageClient } from '@/app/email/unsubscribe/unsubscribe-page-client';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Email Preferences - Voiceover Studio Finder',
  description: 'Email unsubscribe and preference management for Voiceover Studio Finder.',
});

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}

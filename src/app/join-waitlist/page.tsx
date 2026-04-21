import { buildPublicPageMetadata } from '@/lib/seo/metadata';
import { JoinWaitlistPageClient } from '@/app/join-waitlist/join-waitlist-page-client';

export const metadata = buildPublicPageMetadata({
  title: 'Join the Waitlist - Voiceover Studio Finder',
  description:
    'Join the Voiceover Studio Finder waitlist to hear when new studio listings are open and the platform is ready for new members.',
  pathname: '/join-waitlist',
});

export default function JoinWaitlistPage() {
  return <JoinWaitlistPageClient />;
}


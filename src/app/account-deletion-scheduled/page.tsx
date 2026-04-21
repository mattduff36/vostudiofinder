import { AccountDeletionScheduledPageClient } from '@/app/account-deletion-scheduled/account-deletion-scheduled-page-client';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Account Deletion Scheduled - Voiceover Studio Finder',
  description: 'Private account deletion workflow for Voiceover Studio Finder.',
});

export default function AccountDeletionScheduledPage() {
  return <AccountDeletionScheduledPageClient />;
}


import { Metadata } from 'next';
import { Suspense } from 'react';
import { StudiosPage } from '@/components/search/StudiosPage';

export const metadata: Metadata = {
  title: 'Browse Recording Studios - VoiceoverStudioFinder',
  description: 'Search and discover professional recording studios worldwide. Filter by location, services, and studio type to find the perfect space for your voiceover projects.',
  keywords: 'recording studios, voiceover studios, audio production, studio search, professional studios',
};

export default function Studios() {
  return (
    <Suspense fallback={<div>Loading studios...</div>}>
      <StudiosPage />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import { StudiosNewDesign2 } from '@/components/search/StudiosNewDesign2';

function StudiosNewDesign2Content() {
  return <StudiosNewDesign2 />;
}

export default function StudiosNewDesign2Page() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      }>
        <StudiosNewDesign2Content />
      </Suspense>
    </div>
  );
}

'use client';

import { Suspense } from 'react';
import { StudiosNewDesign1 } from '@/components/search/StudiosNewDesign1';

function StudiosNewDesign1Content() {
  return <StudiosNewDesign1 />;
}

export default function StudiosNewDesign1Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      }>
        <StudiosNewDesign1Content />
      </Suspense>
    </div>
  );
}

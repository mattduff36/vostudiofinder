'use client';

import { Suspense } from 'react';
import { StudiosNewDesign3 } from '@/components/search/StudiosNewDesign3';

function StudiosNewDesign3Content() {
  return <StudiosNewDesign3 />;
}

export default function StudiosNewDesign3Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      }>
        <StudiosNewDesign3Content />
      </Suspense>
    </div>
  );
}

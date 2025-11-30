'use client';

import Link from 'next/link';
import { StoryDemo2 } from '@/components/story-demos/StoryDemo2';

export default function StoryDemoPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-2xl font-bold">Selected Story Demo - Split Screen Story</h1>
            <Link href="/" className="text-red-500 hover:text-red-400 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="pt-24">
        <StoryDemo2 />
      </div>

      {/* Description Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-white text-center">
            Split Screen Story - Sections 1-3: Image (left) fades out → new image fades in → text (right) slides out → new text slides in. Final story: Image4 left, text right (both fade in together, no slide). Slower 1s animations.
          </p>
        </div>
      </div>
    </div>
  );
}


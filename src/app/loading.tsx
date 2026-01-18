/**
 * Global Loading Component
 * Shown during route transitions and data fetching
 * Provides a clean, professional loading experience
 */

export default function Loading() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-white"
      style={{ animation: 'fadeIn 0.2s ease-in' }}
    >
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          {/* Animated ring */}
          <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-700 font-medium text-lg">Loading...</p>
      </div>
    </div>
  );
}

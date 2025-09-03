'use client';

interface SearchResultsProps {
  query?: string;
  location?: string;
  totalCount: number;
}

export function SearchResults({ query, location, totalCount }: SearchResultsProps) {
  const formatSearchSummary = () => {
    const parts = [];
    
    if (query) {
      parts.push(`"${query}"`);
    }
    
    if (location) {
      parts.push(`in ${location}`);
    }
    
    if (parts.length === 0) {
      return `Found ${totalCount} recording studios`;
    }
    
    return `Found ${totalCount} recording studios for ${parts.join(' ')}`;
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-blue-900">
            {formatSearchSummary()}
          </h2>
          {(query || location) && (
            <p className="text-sm text-blue-700 mt-1">
              Refine your search using the filters on the left to find exactly what you're looking for.
            </p>
          )}
        </div>
        
        {totalCount === 0 && (
          <div className="text-blue-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.137 0-4.146-.832-5.657-2.343S4 10.137 4 8s.832-4.146 2.343-5.657S8.863 0 12 0s4.146.832 5.657 2.343S20 5.863 20 8c0 2.137-.832 4.146-2.343 5.657L20 16.414l-2.828 2.828L15 17.071z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

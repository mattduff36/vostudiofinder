'use client';

import { useState, useEffect } from 'react';

export default function AdminFAQPage() {
  const [faqData, setFaqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    fetchFAQs();
  }, [search]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/faq?${params}`); // Updated API endpoint
      if (!response.ok) {
        throw new Error('Failed to fetch FAQ data');
      }
      
      const data = await response.json();
      setFaqData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    // @ts-expect-error - Type assertion needed for dynamic data
    if (faqData?.faqs) {
      // @ts-expect-error - Type assertion needed for dynamic data
      setExpandedItems(new Set(faqData.faqs.map((faq: any) => faq.id)));
    }
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">Error Loading FAQ Data</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={fetchFAQs}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!faqData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">❓ VOSF Knowledge Base</h1>
        <p className="text-gray-600 mt-1">
          {/* @ts-expect-error - Type assertion needed for dynamic data */}
          {faqData.statistics?.total || faqData.faqs?.length || 0} frequently asked questions and user inquiries
        </p>
      </div>

      {/* Search & Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search FAQ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search questions or answers..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-2 items-end">
            <button
              onClick={expandAll}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {/* @ts-expect-error - Type assertion needed for dynamic data */}
        {(faqData.faqs || []).map((faq: any, index: number) => {
          const isExpanded = expandedItems.has(faq.id);
          return (
            <div key={faq.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpanded(faq.id)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {faq.question || `FAQ #${faq.id}`}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        FAQ #{faq.id} • Click to {isExpanded ? 'collapse' : 'expand'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <svg
                      className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Question:</h4>
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {faq.question || 'No question provided.'}
                      </div>
                    </div>

                    <h4 className="text-sm font-medium text-gray-700 mb-2">Answer:</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-gray-700 whitespace-pre-wrap">
                        {faq.answer || 'No answer provided.'}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>FAQ ID: {faq.id}</span>
                      {faq.sortOrder && <span>Sort Order: {faq.sortOrder}</span>}
                      {faq.created_at && (
                        <span>Created: {new Date(faq.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {/* @ts-expect-error - Type assertion needed for dynamic data */}
      {(!faqData.faqs || faqData.faqs.length === 0) && !loading && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No FAQs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria.
          </p>
        </div>
      )}

      {/* FAQ Statistics */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Knowledge Base Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            {/* @ts-expect-error - Type assertion needed for dynamic data */}
            <div className="text-2xl font-bold text-blue-600">{faqData.statistics?.total || faqData.faqs?.length || 0}</div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{expandedItems.size}</div>
            <div className="text-sm text-gray-600">Currently Expanded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {/* @ts-expect-error - Type assertion needed for dynamic data */}
              {search ? (faqData.faqs?.length || 0) : (faqData.statistics?.total || faqData.faqs?.length || 0)}
            </div>
            <div className="text-sm text-gray-600">
              {search ? 'Search Results' : 'Available'}
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">💡 About This Knowledge Base</h2>
        <p className="text-blue-800 text-sm mb-4">
          This knowledge base contains FAQ data from the VOSF platform. 
          The questions and answers provide insights into common user inquiries and platform usage.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Search Tips:</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• Search by question or answer content</li>
              <li>• Use keywords to find specific topics</li>
              <li>• Expand items to read full content</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Data Source:</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• VOSF FAQ database</li>
              <li>• User-submitted questions</li>
              <li>• Platform support responses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

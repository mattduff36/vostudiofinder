'use client';

import { useState } from 'react';

export default function AdminQueryPage() {
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/admin/query', { // Updated API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Query execution failed');
      }

      const data = await response.json();
      setQueryResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      executeQuery();
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className={`px-2 py-1 rounded text-xs ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {value ? 'true' : 'false'}
      </span>;
    }
    
    if (typeof value === 'object') {
      return <span className="text-gray-600 italic">[Object]</span>;
    }
    
    const stringValue = String(value);
    if (stringValue.length > 100) {
      return (
        <div className="max-w-xs truncate" title={stringValue}>
          {stringValue}
        </div>
      );
    }
    
    return stringValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💻 SQL Query Interface</h1>
        <p className="text-gray-600 mt-1">
          Execute custom SQL queries against the VOSF database
        </p>
      </div>

      {/* Query Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              SQL Query
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="SELECT * FROM &quot;User&quot; LIMIT 10;"
              className="block w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Press Ctrl+Enter (Cmd+Enter on Mac) to execute. Use double quotes for table names in PostgreSQL.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Available tables: User, UserProfile, Studio, Messages, Reviews, Faq, Contact, Poi
            </div>
            <button
              onClick={executeQuery}
              disabled={loading || !query.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Executing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 6h6" />
                  </svg>
                  Execute Query
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Query Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {queryResults && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Query Results</h3>
            <p className="text-sm text-gray-500 mt-1">
              {/* @ts-expect-error - Type assertion needed for dynamic data */}
              {queryResults.data?.length || 0} rows returned
              {/* @ts-expect-error - Type assertion needed for dynamic data */}
              {queryResults.executionTime && ` in ${queryResults.executionTime}ms`}
            </p>
          </div>
          
          {/* @ts-expect-error - Type assertion needed for dynamic data */}
          {queryResults.data && queryResults.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* @ts-expect-error - Type assertion needed for dynamic data */}
                    {Object.keys(queryResults.data[0]).map((column) => (
                      <th
                        key={column}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* @ts-expect-error - Type assertion needed for dynamic data */}
                  {queryResults.data.map((row: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {Object.values(row).map((value: any, cellIndex: number) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatValue(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your query executed successfully but returned no rows.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Query Examples */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">💡 Quick Query Examples</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">User Information</h4>
            <div className="space-y-2">
              <button
                onClick={() => setQuery('SELECT username, "display_name", email, status FROM "User" WHERE status = 1 ORDER BY "created_at" DESC LIMIT 10;')}
                className="block w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 font-mono"
              >
                Active users (recent)
              </button>
              <button
                onClick={() => setQuery('SELECT COUNT(*) as total_users, SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_users FROM "User";')}
                className="block w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 font-mono"
              >
                User statistics
              </button>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Studio Analysis</h4>
            <div className="space-y-2">
              <button
                onClick={() => setQuery('SELECT name, description, status FROM "Studio" WHERE status = \'ACTIVE\' ORDER BY "created_at" DESC LIMIT 10;')}
                className="block w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 font-mono"
              >
                Active studios
              </button>
              <button
                onClick={() => setQuery('SELECT name, description FROM "Poi" ORDER BY name LIMIT 10;')}
                className="block w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 font-mono"
              >
                Recording venues
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Safety Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Only SELECT queries are allowed for security reasons. Modifying queries (INSERT, UPDATE, DELETE) are not permitted.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
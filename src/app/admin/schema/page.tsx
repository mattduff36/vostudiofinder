'use client';

import { useState, useEffect } from 'react';
import { AdminTabs } from '@/components/admin/AdminTabs';

export default function AdminSchemaPage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchSchema();
    }
  }, [selectedTable]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/schema/tables'); // Updated API endpoint
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      const data = await response.json();
      setTables(data.tables || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/schema?table=${encodeURIComponent(selectedTable)}`); // Updated API endpoint

      if (!response.ok) {
        throw new Error('Failed to fetch schema');
      }

      const data = await response.json();
      setSchema(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setSchema(null);
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int')) return '🔢';
    if (lowerType.includes('text') || lowerType.includes('varchar') || lowerType.includes('char')) return '📝';
    if (lowerType.includes('date') || lowerType.includes('time')) return '📅';
    if (lowerType.includes('bool')) return '✅';
    if (lowerType.includes('real') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal')) return '🔢';
    return '📄';
  };

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int')) return 'text-blue-600 bg-blue-50';
    if (lowerType.includes('text') || lowerType.includes('varchar') || lowerType.includes('char')) return 'text-green-600 bg-green-50';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'text-purple-600 bg-purple-50';
    if (lowerType.includes('bool')) return 'text-orange-600 bg-orange-50';
    if (lowerType.includes('real') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal')) return 'text-indigo-600 bg-indigo-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <>
      <AdminTabs activeTab="schema" />
      <div className="min-h-screen bg-gray-50 relative">
        {/* Subtle red gradient overlays in corners */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {/* Top-left gradient */}
          <div 
            className="absolute top-0 left-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at top left, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Top-right gradient */}
          <div 
            className="absolute top-0 right-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at top right, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Bottom-left gradient */}
          <div 
            className="absolute bottom-0 left-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at bottom left, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Bottom-right gradient */}
          <div 
            className="absolute bottom-0 right-0 w-96 h-96 opacity-50"
            style={{
              background: 'radial-gradient(circle at bottom right, #d42027 0%, transparent 70%)'
            }}
          />
          {/* Center gradient */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10"
            style={{
              background: 'radial-gradient(circle at center, #d42027 0%, transparent 70%)'
            }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🗂️ Database Schema Viewer</h1>
        <p className="text-gray-600 mt-1">
          Explore table structures and column definitions in the VOSF database
        </p>
      </div>

      {/* Table Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Select Table</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tables.map((table) => (
            <button
              key={table}
              onClick={() => handleTableSelect(table)}
              className={`p-3 text-left border rounded-lg transition-colors duration-200 ${
                selectedTable === table
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{table}</div>
              <div className="text-xs text-gray-500 mt-1">View schema</div>
            </button>
          ))}
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
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Display */}
      {selectedTable && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Schema: {selectedTable}</h2>
                {schema && (
                  <p className="text-sm text-gray-500 mt-1">
                    {/* @ts-expect-error - Type assertion needed for dynamic data */}
                    {schema.columns?.length || 0} columns defined
                  </p>
                )}
              </div>
              {loading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>

          {/* @ts-expect-error - Type assertion needed for dynamic data */}
          {schema && schema.columns && schema.columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Column
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nullable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Default
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Primary Key
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* @ts-expect-error - Type assertion needed for dynamic data */}
                  {schema.columns.map((column: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getTypeIcon(column.DATA_TYPE || column.data_type || column.type || '')}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {column.COLUMN_NAME || column.column_name || column.name || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(column.DATA_TYPE || column.data_type || column.type || '')}`}>
                          {column.DATA_TYPE || column.data_type || column.type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(column.IS_NULLABLE === 'YES' || column.is_nullable === 'YES' || column.nullable === true) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(column.COLUMN_DEFAULT !== null && column.COLUMN_DEFAULT !== undefined) || 
                         (column.column_default !== null && column.column_default !== undefined) ||
                         (column.default !== null && column.default !== undefined) ? (
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {column.COLUMN_DEFAULT || column.column_default || column.default}
                          </code>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(column.COLUMN_KEY === 'PRI' || column.column_key === 'PRI' || column.primary_key === true) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            🔑 Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : selectedTable && !loading ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No schema found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Could not load schema information for table "{selectedTable}".
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Schema Legend */}
      {selectedTable && schema && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📖 Schema Legend</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Data Types</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span>🔢</span>
                  <span className="text-blue-600">INTEGER, INT</span>
                  <span className="text-gray-500">- Whole numbers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📝</span>
                  <span className="text-green-600">TEXT, VARCHAR</span>
                  <span className="text-gray-500">- Text strings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📅</span>
                  <span className="text-purple-600">DATE, DATETIME</span>
                  <span className="text-gray-500">- Date/time values</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✅</span>
                  <span className="text-orange-600">BOOLEAN</span>
                  <span className="text-gray-500">- True/false values</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Column Properties</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span>🔑</span>
                  <span className="font-medium">Primary Key</span>
                  <span className="text-gray-500">- Unique identifier</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✓</span>
                  <span className="font-medium text-green-600">Nullable</span>
                  <span className="text-gray-500">- Can contain NULL values</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✗</span>
                  <span className="font-medium text-red-600">Not Null</span>
                  <span className="text-gray-500">- Must have a value</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedTable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">💡 How to Use Schema Viewer</h2>
          <div className="text-blue-800 text-sm space-y-2">
            <p>• Select a table from the grid above to view its schema</p>
            <p>• Column information includes data types, constraints, and default values</p>
            <p>• Primary keys are highlighted with a key icon</p>
            <p>• Use this information to understand table structure for queries</p>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';

export default function AdminBrowsePage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, page]);

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

  const fetchTableData = async () => {
    try {
      setLoading(true);
      setError('');
      const offset = (page - 1) * limit;
      const response = await fetch(`/api/admin/browse?table=${encodeURIComponent(selectedTable)}&limit=${limit}&offset=${offset}`); // Updated API endpoint

      if (!response.ok) {
        throw new Error('Failed to fetch table data');
      }

      const data = await response.json();
      setTableData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    setTableData(null);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
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
    if (stringValue.length > 50) {
      return (
        <div className="max-w-xs truncate" title={stringValue}>
          {stringValue}
        </div>
      );
    }
    
    return stringValue;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📋 Browse Database Tables</h1>
        <p className="text-gray-600 mt-1">
          Explore raw data from all tables in the VOSF database
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
              <div className="text-xs text-gray-500 mt-1">Click to browse</div>
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

      {/* Table Data */}
      {selectedTable && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Table: {selectedTable}</h2>
                {tableData && (
                  <p className="text-sm text-gray-500 mt-1">
                    {/* @ts-expect-error - Type assertion needed for dynamic data */}
                    Showing {tableData.data?.length || 0} rows
                    {/* @ts-expect-error - Type assertion needed for dynamic data */}
                    {tableData.total && ` of ${tableData.total} total`}
                    {/* @ts-expect-error - Type assertion needed for dynamic data */}
                    {tableData.page && ` (Page ${tableData.page})`}
                  </p>
                )}
              </div>
              {loading && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
            </div>
          </div>

          {/* @ts-expect-error - Type assertion needed for dynamic data */}
          {tableData && tableData.data && tableData.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* @ts-expect-error - Type assertion needed for dynamic data */}
                      {Object.keys(tableData.data[0]).map((column) => (
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
                    {tableData.data.map((row: any, index: number) => (
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

              {/* Pagination */}
              {/* @ts-expect-error - Type assertion needed for dynamic data */}
              {tableData.total && tableData.total > limit && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {/* @ts-expect-error - Type assertion needed for dynamic data */}
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, tableData.total)} of {tableData.total} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {/* @ts-expect-error - Type assertion needed for dynamic data */}
                      Page {page} of {Math.ceil(tableData.total / limit)}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= Math.ceil((tableData as any).total / limit)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : selectedTable && !loading ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No data found</h3>
              <p className="mt-1 text-sm text-gray-500">
                The table &quot;{selectedTable}&quot; appears to be empty or could not be loaded.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Instructions */}
      {!selectedTable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-2">💡 How to Browse Tables</h2>
          <div className="text-blue-800 text-sm space-y-2">
            <p>• Select a table from the grid above to view its contents</p>
            <p>• Use pagination controls to navigate through large datasets</p>
            <p>• Table data is displayed with proper formatting and null value handling</p>
            <p>• All tables from the VOSF database are available for browsing</p>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showSuccess, showError } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  type: string;
  created_at: Date;
}

interface WaitlistTableProps {
  entries: WaitlistEntry[];
}

export function WaitlistTable({ entries }: WaitlistTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GENERAL' | 'FEATURED'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEntries = entries.filter(
    (entry) => {
      const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || entry.type === typeFilter;
      return matchesSearch && matchesType;
    }
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Waitlist Entry?',
      message: `Are you sure you want to delete ${name} from the waitlist? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
    });
    
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/waitlist/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Delete failed:', data);
        throw new Error(data.error || 'Failed to delete entry');
      }

      // Refresh the page to show updated list
      showSuccess(`${name} has been removed from the waitlist`);
      router.refresh();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showError(`Failed to delete entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Joined Date'];
    const rows = entries.map((entry) => [
      entry.name,
      entry.email,
      new Date(entry.created_at).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Search, Filter and Export */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:gap-4">
            <div className="flex-1 md:max-w-md">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'GENERAL' | 'FEATURED')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="FEATURED">Featured</option>
                <option value="GENERAL">General</option>
              </select>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-500">
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
        </div>
      </div>

      {/* Mobile Card List - Hidden on desktop */}
      <div className="md:hidden space-y-3 p-4">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No entries match your search' : 'No waitlist entries yet'}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {entry.name}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  entry.type === 'FEATURED' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {entry.type === 'FEATURED' ? '⭐ Featured' : 'General'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2 break-words">{entry.email}</p>
              <p className="text-xs text-gray-500 mb-3">
                Joined: {formatDate(entry.created_at)}
              </p>
              <button
                onClick={() => handleDelete(entry.id, entry.name)}
                disabled={deletingId === entry.id}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {deletingId === entry.id ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'No entries match your search' : 'No waitlist entries yet'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      entry.type === 'FEATURED' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {entry.type === 'FEATURED' ? '⭐ Featured' : 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(entry.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(entry.id, entry.name)}
                      disabled={deletingId === entry.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Delete entry"
                    >
                      {deletingId === entry.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


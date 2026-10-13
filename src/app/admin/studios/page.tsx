'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { StudioDetails } from '@/components/admin/studios/StudioDetails';
import { COLUMN_CONFIG, type Studio, type BulkActionResult } from '@/components/admin/studios/types';
import { useAdminStudioList } from '@/hooks/useAdminStudioList';
import type { ProfileSectionId } from '@/lib/profile/completion-sections';
import { Modal } from '@/components/ui/Modal';
import { Lightbulb, Check, X, Columns, ChevronDown, RotateCcw, FlaskConical, Trash2 } from 'lucide-react';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import AddStudioModal from '@/components/admin/AddStudioModal';
import AdminBulkOperations from '@/components/admin/AdminBulkOperations';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { getCompletionBgColor } from '@/lib/utils/profile-completion';
import { formatRelativeDate, formatDate } from '@/lib/date-format';
import { parseDateInputValueToIsoUtc } from '@/lib/date-input';
import { showSuccess, showError } from '@/lib/toast';
import { showConfirm } from '@/components/ui/ConfirmDialog';
import { TEST_EMAIL_DOMAIN } from '@/lib/admin/test-data-generator';

export default function AdminStudiosPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { studios, pagination, pending: loading, initialLoading, error,
    refresh: fetchStudios, refreshStudio, beginMutation, endMutation, pendingIds,
    loadMore, previousWindow, isNextWindow } = useAdminStudioList({ search: debouncedSearch, status: statusFilter, sortBy, sortOrder });
  const [expandedStudios, setExpandedStudios] = useState<Set<string>>(new Set());
  const [initialEditSection, setInitialEditSection] = useState<ProfileSectionId>('basic');
  const [editSession, setEditSession] = useState(0);
  const bulkPending = useRef(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState(0);
  useEffect(() => {
    const visibleIds = new Set(studios.map(studio => studio.id));
    setExpandedStudios(current => new Set([...current].filter(id => visibleIds.has(id))));
    setSelectedStudios(current => current.filter(id => visibleIds.has(id)));
  }, [studios]);
  const toggleExpanded = (id: string) => setExpandedStudios(current => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  const handleSummaryClick = (event: React.MouseEvent, id: string) => {
    if ((event.target as HTMLElement).closest('button,a,input,select,textarea,[data-studio-details]')) return;
    if (window.getSelection()?.toString()) return;
    toggleExpanded(id);
  };
  const handlePersistedChange = useCallback(({ studioId }: { studioId: string }) => { void refreshStudio(studioId); }, [refreshStudio]);
  
  // Featured expiry modal state
  const [featuredExpiryModalOpen, setFeaturedExpiryModalOpen] = useState(false);
  const [featuredStudioId, setFeaturedStudioId] = useState<string | null>(null);
  const [featuredExpiryDate, setFeaturedExpiryDate] = useState('');

  // Table container ref for scaling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  
  // Table scaling state
  const [tableScale, setTableScale] = useState(1);
  
  // Column visibility configuration
  // Protected columns: 'studio' and 'actions' (always visible)
  const STORAGE_KEY = 'admin-studios-hidden-columns';
  
  // User-controlled hidden columns (loaded from localStorage)
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  
  // Load column preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any protected columns that might have been saved
          const validHidden = parsed.filter(
            (col: string) => COLUMN_CONFIG.find(c => c.id === col && !c.protected)
          );
          setHiddenColumns(validHidden);
        }
      }
    } catch (err) {
      console.error('Failed to load column preferences:', err);
    }
  }, []);
  
  // Save column preferences to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenColumns));
    } catch (err) {
      console.error('Failed to save column preferences:', err);
    }
  }, [hiddenColumns]);
  
  // Close column menu when clicking outside
  useEffect(() => {
    if (!isColumnMenuOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setIsColumnMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);
  
  // Compute table scale based on container vs table width
  const computeTableScale = useCallback(() => {
    const container = tableContainerRef.current;
    const table = tableRef.current;
    if (!container || !table) return;
    
    // Force layout recalculation
    void table.offsetWidth;
    
    const containerWidth = container.clientWidth;
    const tableWidth = table.scrollWidth;
    
    if (tableWidth > containerWidth) {
      const scale = containerWidth / tableWidth;
      // Minimum scale of 0.5 (50%) to keep content readable
      setTableScale(Math.max(scale, 0.5));
    } else {
      setTableScale(1);
    }
  }, []);
  
  // Compute scale when data loads or hiddenColumns change
  useEffect(() => {
    if (loading || studios.length === 0) return;
    
    const timer = setTimeout(() => {
      computeTableScale();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loading, studios.length, hiddenColumns, computeTableScale]);
  
  useEffect(() => {
    const table = tableRef.current;
    if (!table || loading && studios.length === 0) return;
    const measure = () => { setTableHeight(table.scrollHeight); computeTableScale(); };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(table);
    return () => observer.disconnect();
  }, [studios.length, expandedStudios, hiddenColumns, loading, computeTableScale]);

  // Compute scale on window resize
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        computeTableScale();
      }, 150);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [computeTableScale]);
  
  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    const column = COLUMN_CONFIG.find(c => c.id === columnId);
    if (!column || column.protected) return;
    
    setHiddenColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };
  
  // Reset columns to show all
  const resetColumns = () => {
    setHiddenColumns([]);
  };
  
  // Check if column is visible
  const isColumnVisible = (columnId: string) => !hiddenColumns.includes(columnId);
  
  // Count visible columns
  const visibleColumnCount = COLUMN_CONFIG.filter(c => !hiddenColumns.includes(c.id)).length;

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value); setSelectedStudios([]);
  };
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value); setSelectedStudios([]);
  };
  const handleEditStudio = (studio: Studio, section: ProfileSectionId = 'basic') => {
    setEditingStudio(studio); setInitialEditSection(section); setEditSession(value => value + 1); setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false); setEditingStudio(null);
  };
  const mutateStudio = async (studio: Studio, operation: string, body: object, message: string) => {
    if (!beginMutation([studio.id])) return false;
    try {
      const response = await fetch(`/api/admin/studios/${studio.id}/${operation}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Failed to update ${operation}. Please retry.`);
      showSuccess(message);
      await refreshStudio(studio.id);
      return true;
    } catch (failure) { showError(failure instanceof Error ? failure.message : 'Unable to update studio.'); return false; }
    finally { endMutation([studio.id]); }
  };

  const handleDeleteStudio = async (studio: Studio) => {
    const confirmed = await showConfirm({
      title: 'Delete Studio?',
      message: `WARNING: This will permanently delete "${studio.name}" AND the associated user account!\n\nThis includes:\n• User account\n• Studio profile\n• All images\n• All reviews\n• All related data\n\nThis action CANNOT be undone. Are you sure?`,
      confirmText: 'Delete Permanently',
      isDangerous: true,
    });
    
    if (!confirmed || !beginMutation([studio.id])) return;

    try {
      const response = await fetch(`/api/admin/studios/${studio.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete studio and user account');
      }

      showSuccess('Studio and user account deleted successfully');
      await refreshStudio(studio.id);
    } catch (error) {
      console.error('Error deleting studio:', error);
      showError('Failed to delete studio and user account. Please try again.');
    } finally { endMutation([studio.id]); }
  };

  const deleteTestsPending = useRef(false);
  const handleDeleteTestAccounts = async () => {
    if (deleteTestsPending.current) return;
    deleteTestsPending.current = true;
    try {
    // Count test accounts in current list
    const testCount = studios.filter(s => s.users.email.endsWith(`@${TEST_EMAIL_DOMAIN}`)).length;
    
    const confirmed = await showConfirm({
      title: 'Delete All Test Accounts?',
      message: `This will permanently delete ALL accounts with @${TEST_EMAIL_DOMAIN} emails${testCount > 0 ? ` (at least ${testCount} visible in current list)` : ''}.\n\nThis includes their studio profiles, images, and all related data.\n\nThis action CANNOT be undone.`,
      confirmText: 'Delete All Test Accounts',
      isDangerous: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/delete-test-accounts', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete test accounts');
      }

      const result = await response.json();
      showSuccess(result.message);
      fetchStudios();
    } catch (error) {
      console.error('Error deleting test accounts:', error);
      showError(error instanceof Error ? error.message : 'Failed to delete test accounts');
    }
    } finally { deleteTestsPending.current = false; }
  };

  const handleToggleVisibility = (studio: Studio, value: boolean) => mutateStudio(studio, 'visibility', { isVisible: value }, `Profile visibility ${value ? 'enabled' : 'disabled'} for ${studio.name}`);
  const handleToggleVerified = (studio: Studio, value: boolean) => mutateStudio(studio, 'verified', { isVerified: value }, `Studio ${value ? 'verified' : 'unverified'}: ${studio.name}`);
  const handleToggleAdminReview = (studio: Studio, value: boolean) => mutateStudio(studio, 'admin-review', { adminReview: value }, `Admin review ${value ? 'enabled' : 'disabled'} for ${studio.name}`);
  const handleToggleStatus = (studio: Studio, value: 'ACTIVE' | 'INACTIVE') => mutateStudio(studio, 'status', { status: value }, `Studio status updated to ${value}: ${studio.name}`);
  const handleToggleFeatured = (studio: Studio, value: boolean) => {
    if (pendingIds.has(studio.id)) return;
    if (!value) { void mutateStudio(studio, 'featured', { isFeatured: false }, `Studio unfeatured: ${studio.name}`); return; }
    const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 6);
    setFeaturedStudioId(studio.id); setFeaturedExpiryDate(expiry.toISOString().slice(0, 10)); setFeaturedExpiryModalOpen(true);
  };
  const handleConfirmFeatured = async () => {
    const id = featuredStudioId;
    const studio = studios.find(row => row.id === id);
    const expiry = parseDateInputValueToIsoUtc(featuredExpiryDate);
    if (!studio || !expiry) { showError('Please select a studio and valid expiry date.'); return; }
    const success = await mutateStudio(studio, 'featured', { isFeatured: true, featuredUntil: expiry }, `Studio featured: ${studio.name}`);
    if (success) { setFeaturedExpiryModalOpen(false); setFeaturedStudioId(null); setFeaturedExpiryDate(''); }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
    // Clear studios and reset pagination
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const handleSelectStudio = (studio_id: string, isSelected: boolean) => {
    setSelectedStudios(prev => 
      isSelected 
        ? [...prev, studio_id]
        : prev.filter(id => id !== studio_id)
    );
  };

  const handleClearSelection = () => {
    setSelectedStudios([]);
  };

  const handleBulkAction = async (action: string, studioIds: string[]): Promise<BulkActionResult> => {
    if (bulkPending.current || studioIds.some(id => pendingIds.has(id))) return { status: 'failed', processedIds: [] };
    bulkPending.current = true;
    let ownsMutation = false;
    try {
    // Add confirmation for delete action
    if (action === 'delete') {
      const count = studioIds.length;
      const confirmed = await showConfirm({
        title: `Delete ${count} Studio${count !== 1 ? 's' : ''}?`,
        message: `WARNING: This will permanently delete ${count} studio${count !== 1 ? 's' : ''} AND their associated user accounts!\n\nThis includes:\n• ${count} user account${count !== 1 ? 's' : ''}\n• ${count} studio profile${count !== 1 ? 's' : ''}\n• All images, reviews, and related data\n\nThis action CANNOT be undone. Are you sure?`,
        confirmText: 'Delete All',
        isDangerous: true,
      });
      
      if (!confirmed) return { status: 'cancelled', processedIds: [] };
    }

    if (action !== 'export') {
      ownsMutation = beginMutation(studioIds);
      if (!ownsMutation) return { status: 'failed', processedIds: [] };
    }
    try {
      const response = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, studioIds })
      });

      if (!response.ok) throw new Error('Bulk operation failed');
      if (action === 'export') {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studios_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return { status: 'success', processedIds: studioIds };
      }

      if (!response.ok) throw new Error('Bulk operation failed');
      
      const result = await response.json();
      showSuccess(result.message);
      
      fetchStudios();
      const processedIds: string[] = Array.isArray(result.processedIds) ? result.processedIds.filter((id: unknown): id is string => typeof id === 'string' && studioIds.includes(id)) : [];
      return { status: processedIds.length === studioIds.length ? 'success' : 'partial', processedIds };
    } catch (error) {
      showError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { status: 'failed', processedIds: [] };
    }
    } finally { if (ownsMutation) endMutation(studioIds); bulkPending.current = false; }
  };

  return (
    <>
      <AdminTabs activeTab="studios" />
      <div ref={toolbarRef} tabIndex={-1} className="px-4 py-4 md:p-8 min-h-screen">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Studio Management</h1>
              <p className="text-gray-600 mt-2">
            {pagination.total} studios in the Voice Over Studio Finder network
          </p>
        </div>
        <div className="flex items-center gap-2">
          {studios.some(s => s.users.email.endsWith(`@${TEST_EMAIL_DOMAIN}`)) && (
            <button
              onClick={handleDeleteTestAccounts}
              className="px-4 py-2 border border-orange-300 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
              title="Delete all test accounts (@vostudiofinder-test.com)"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete Test Accounts</span>
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Studio
          </button>
        </div>
      </div>

      {/* Bulk Operations */}
      <AdminBulkOperations
        selectedStudios={selectedStudios}
        onBulkAction={handleBulkAction}
        onClearSelection={handleClearSelection}
        onProcessed={(ids) => setSelectedStudios(current => current.filter(id => !ids.includes(id)))}
      />

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Studios
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
                placeholder="Search by name, owner, or description..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={handleStatusChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Studios</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="DRAFT">Draft Only</option>
              <option value="PENDING">Pending Only</option>
            </select>
          </div>
          
          {/* Column Visibility Filter */}
          <div className="sm:w-auto hidden md:block" ref={columnMenuRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visible Columns
            </label>
            <div className="relative">
              <button
                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <Columns className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{visibleColumnCount}/{COLUMN_CONFIG.length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isColumnMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isColumnMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 border-b border-gray-100">
                    <button
                      onClick={resetColumns}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to Default
                    </button>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {COLUMN_CONFIG.map(column => (
                      <label
                        key={column.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer ${
                          column.protected 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isColumnVisible(column.id)}
                          onChange={() => toggleColumn(column.id)}
                          disabled={column.protected}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span>{column.label}</span>
                        {column.protected && (
                          <span className="text-xs text-gray-400 ml-auto">(required)</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Scale indicator (shown when table is scaled) */}
        {tableScale < 1 && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Table scaled to {Math.round(tableScale * 100)}% to fit screen. Hide columns above to increase size.
          </div>
        )}
      </div>

      {error && <div role="alert" className="my-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800"><p>{error}</p><button type="button" onClick={fetchStudios} className="underline mt-2">Retry</button></div>}
      {loading && !initialLoading && <p role="status" className="my-2 text-sm text-gray-600">Updating studios…</p>}
      {pagination.offset > 0 && <div className="my-3 flex gap-4 items-center"><button type="button" disabled={loading} onClick={previousWindow} className="text-blue-700 underline">Previous studios</button><span className="text-sm text-gray-600">Showing {pagination.offset + 1}–{pagination.offset + studios.length} of {pagination.total}</span></div>}
      {/* Studios Table */}
      {initialLoading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card List - Hidden on desktop */}
          <div className="md:hidden space-y-4">
            {studios.map((studio) => (
              <div key={studio.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors" onClick={(event) => handleSummaryClick(event, studio.id)} data-studio-id={studio.id}>
                {/* Studio Name and Avatar */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">
                      {studio.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 break-words">
                      {studio.name}
                      <button type="button" onClick={(event) => { event.stopPropagation(); toggleExpanded(studio.id); }} aria-expanded={expandedStudios.has(studio.id)} aria-controls={`studio-mobile-${studio.id}`} aria-label={`${expandedStudios.has(studio.id) ? 'Collapse' : 'Expand'} ${studio.name}`} className="inline-flex align-middle ml-2 p-1 rounded hover:bg-gray-100"><ChevronDown className={`w-4 h-4 transition-transform ${expandedStudios.has(studio.id) ? 'rotate-180' : ''}`} /></button>
                    </h3>
                    <p className="text-sm text-gray-600">@{studio.users.username}</p>
                    <p className="text-xs text-gray-500">
                      {studio.users.email}
                      {studio.users.email.endsWith(`@${TEST_EMAIL_DOMAIN}`) && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                          <FlaskConical className="w-2.5 h-2.5" />
                          TEST
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="flex flex-wrap gap-2 mb-3" onClick={e => e.stopPropagation()}>
                  {/* Status */}
                  <button disabled={pendingIds.has(studio.id)}
                    onClick={() => handleToggleStatus(studio, studio.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      studio.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {studio.status === 'ACTIVE' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {studio.status}
                  </button>

                  {/* Visibility */}
                  <button disabled={pendingIds.has(studio.id)}
                    onClick={() => handleToggleVisibility(studio, !studio.is_profile_visible)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      studio.is_profile_visible ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {studio.is_profile_visible ? 'Visible' : 'Hidden'}
                  </button>

                  {/* Admin Review */}
                  <button disabled={pendingIds.has(studio.id)}
                    onClick={() => handleToggleAdminReview(studio, !studio.admin_review)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      studio.admin_review ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                    }`}
                    title="Flag this profile for admin review"
                  >
                    {studio.admin_review ? 'Admin Review' : 'No Review'}
                  </button>

                  {/* Verified */}
                  <button disabled={pendingIds.has(studio.id)}
                    onClick={() => handleToggleVerified(studio, !studio.is_verified)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      studio.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {studio.is_verified ? '✓ Verified' : 'Unverified'}
                  </button>

                  {/* Featured */}
                  <button disabled={pendingIds.has(studio.id)}
                    onClick={() => handleToggleFeatured(studio, !studio.is_featured)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      studio.is_featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {studio.is_featured ? '⭐ Featured' : 'Not Featured'}
                  </button>
                </div>

                {/* Completion & Membership */}
                <div className="flex items-center justify-between mb-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Complete:</span>
                    <div className="bg-gray-200 rounded-full h-2 w-20">
                      <div
                        className={`h-2 rounded-full ${getCompletionBgColor(studio.profile_completion || 0)}`}
                        style={{ width: `${studio.profile_completion || 0}%` }}
                      />
                    </div>
                    <span className="font-medium text-gray-700">{studio.profile_completion || 0}%</span>
                  </div>
                </div>

                {/* Membership Expiry */}
                {studio.membership_expires_at && (
                  <div className="text-xs text-gray-600 mb-3">
                    <span className="font-medium">Expires:</span>{' '}
                    <span className={
                      new Date(studio.membership_expires_at) < new Date()
                        ? 'text-red-600 font-medium'
                        : new Date(studio.membership_expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? 'text-orange-600 font-medium'
                        : ''
                    }>
                      {formatDate(studio.membership_expires_at)}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => window.open(`/${studio.users.username}`, '_blank')}
                    className="flex-1 px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleEditStudio(studio)}
                    className="flex-1 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button disabled={pendingIds.has(studio.id)}
                    onClick={() => handleDeleteStudio(studio)}
                    className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
                <div id={`studio-mobile-${studio.id}`} hidden={!expandedStudios.has(studio.id)}>{expandedStudios.has(studio.id) && <StudioDetails studio={studio} />}</div>
              </div>
            ))}

            {/* Mobile Load More */}
            {pagination.hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Loading...' : isNextWindow ? 'Next Studios' : 'Load More Studios'}
              </button>
            )}

            {/* Mobile No Results */}
            {studios.length === 0 && !loading && !error && (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No studios found</p>
              </div>
            )}
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div 
              ref={tableContainerRef} 
              className="overflow-hidden"
              style={tableScale < 1 && tableHeight ? { height: tableHeight * tableScale } : undefined}
            >
              <div
                style={{
                  transform: `scale(${tableScale})`,
                  transformOrigin: 'top left',
                  width: tableScale < 1 ? `${100 / tableScale}%` : '100%',
                }}
              >
              <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {isColumnVisible('select') && (
                      <th data-column="select" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                    )}
                    {isColumnVisible('adminReview') && (
                      <th
                        data-column="adminReview"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('admin_review')}
                        title="Click to sort by admin review flag"
                      >
                        Admin Review{getSortIcon('admin_review')}
                      </th>
                    )}
                    {isColumnVisible('studio') && (
                      <th 
                        data-column="studio"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('name')}
                        title="Click to sort by studio name"
                      >
                        Studio{getSortIcon('name')}
                      </th>
                    )}
                    {isColumnVisible('type') && (
                      <th data-column="type" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                    )}
                    {isColumnVisible('owner') && (
                      <th 
                        data-column="owner"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('owner')}
                        title="Click to sort by owner name"
                      >
                        Owner{getSortIcon('owner')}
                      </th>
                    )}
                    {isColumnVisible('status') && (
                      <th 
                        data-column="status"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('status')}
                        title="Click to sort by status (Active/Inactive)"
                      >
                        Status{getSortIcon('status')}
                      </th>
                    )}
                    {isColumnVisible('visible') && (
                      <th 
                        data-column="visible"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('is_profile_visible')}
                        title="Click to sort by visibility status"
                      >
                        Visible{getSortIcon('is_profile_visible')}
                      </th>
                    )}
                    {isColumnVisible('complete') && (
                      <th 
                        data-column="complete"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('profile_completion')}
                        title="Click to sort by profile completion percentage"
                      >
                        Complete{getSortIcon('profile_completion')}
                      </th>
                    )}
                    {isColumnVisible('verified') && (
                      <th 
                        data-column="verified"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('is_verified')}
                        title="Click to sort by verified status"
                      >
                        Verified{getSortIcon('is_verified')}
                      </th>
                    )}
                    {isColumnVisible('featured') && (
                      <th 
                        data-column="featured"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('is_featured')}
                        title="Click to sort by featured status"
                      >
                        Featured{getSortIcon('is_featured')}
                      </th>
                    )}
                    {isColumnVisible('lastLogin') && (
                      <th 
                        data-column="lastLogin"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('last_login')}
                        title="Click to sort by last login date"
                      >
                        Last Login{getSortIcon('last_login')}
                      </th>
                    )}
                    {isColumnVisible('membershipExpires') && (
                      <th 
                        data-column="membershipExpires"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('membership_expires_at')}
                        title="Click to sort by membership expiry date"
                      >
                        Membership Expires{getSortIcon('membership_expires_at')}
                      </th>
                    )}
                    {isColumnVisible('updated') && (
                      <th 
                        data-column="updated"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('updated_at')}
                      >
                        Updated{getSortIcon('updated_at')}
                      </th>
                    )}
                    {isColumnVisible('actions') && (
                      <th data-column="actions" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studios.map((studio) => (
                    <Fragment key={studio.id}><tr className={`hover:bg-gray-50 cursor-pointer ${selectedStudios.includes(studio.id) ? 'bg-blue-50' : ''}`} onClick={(event) => handleSummaryClick(event, studio.id)} data-studio-id={studio.id}>
                      {isColumnVisible('select') && (
                        <td data-column="select" className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${studio.name}`}
                            checked={selectedStudios.includes(studio.id)}
                            onChange={(e) => handleSelectStudio(studio.id, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      {isColumnVisible('adminReview') && (
                        <td
                          data-column="adminReview"
                          className="px-6 py-4 whitespace-nowrap text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button disabled={pendingIds.has(studio.id)}
                            onClick={() => handleToggleAdminReview(studio, !studio.admin_review)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                              studio.admin_review ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                            title={studio.admin_review ? 'Admin review enabled - click to disable' : 'Admin review disabled - click to enable'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                studio.admin_review ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      )}
                      {isColumnVisible('studio') && (
                        <td data-column="studio" className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center mr-3 ${
                              studio.membership_tier === 'PREMIUM'
                                ? 'bg-gradient-to-br from-amber-300 to-yellow-500'
                                : 'bg-gray-300'
                            }`}>
                              <span className={`text-sm font-bold ${
                                studio.membership_tier === 'PREMIUM' ? 'text-amber-900' : 'text-gray-600'
                              }`}>
                                {studio.membership_tier === 'PREMIUM' ? 'P' : 'B'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-start text-sm font-medium text-gray-900">
                                <span className="min-w-0 line-clamp-2">{studio.name}</span>
                                <button type="button" onClick={(event) => { event.stopPropagation(); toggleExpanded(studio.id); }} aria-expanded={expandedStudios.has(studio.id)} aria-controls={`studio-desktop-${studio.id}`} aria-label={`${expandedStudios.has(studio.id) ? 'Collapse' : 'Expand'} ${studio.name}`} className="inline-flex shrink-0 align-middle ml-2 p-1 rounded hover:bg-gray-100"><ChevronDown className={`w-4 h-4 transition-transform ${expandedStudios.has(studio.id) ? 'rotate-180' : ''}`} /></button>
                              </div>
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {studio.users.username}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('type') && (
                        <td data-column="type" className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {studio.studio_studio_types && studio.studio_studio_types.length > 0 
                              ? studio.studio_studio_types
                                  .map(st => {
                                    const type = st.studio_type;
                                    if (type === 'VO_COACH') return 'C';
                                    return type.charAt(0);
                                  })
                                  .join('')
                              : '-'
                            }
                          </span>
                        </td>
                      )}
                      {isColumnVisible('owner') && (
                        <td data-column="owner" className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{studio.users.display_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1.5">
                            {studio.users.email}
                            {studio.users.email.endsWith(`@${TEST_EMAIL_DOMAIN}`) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                                <FlaskConical className="w-2.5 h-2.5" />
                                TEST
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {isColumnVisible('status') && (
                        <td data-column="status" className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button disabled={pendingIds.has(studio.id)}
                            onClick={() => handleToggleStatus(studio, studio.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              studio.status === 'ACTIVE' 
                                ? 'bg-green-600 text-white focus:ring-green-500' 
                                : 'bg-red-600 text-white focus:ring-red-500'
                            }`}
                            title={`Click to toggle status (currently ${studio.status})`}
                          >
                            {studio.status === 'ACTIVE' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                          {studio.is_spotlight && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800 cursor-help mt-1" 
                              title="Spotlight Studio – highlighted in network"
                            >
                              <Lightbulb className="w-3 h-3" aria-hidden="true" />
                              <span>Spotlight</span>
                            </span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('visible') && (
                        <td data-column="visible" className="px-6 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                          <button disabled={pendingIds.has(studio.id)}
                            onClick={() => handleToggleVisibility(studio, !studio.is_profile_visible)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              studio.is_profile_visible ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                            title={studio.is_profile_visible ? 'Profile is visible - click to hide' : 'Profile is hidden - click to show'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                studio.is_profile_visible ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      )}
                      {isColumnVisible('complete') && (
                        <td data-column="complete" className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="bg-gray-200 rounded-full h-2 w-16">
                              <div
                                className={`h-2 rounded-full transition-all ${getCompletionBgColor(studio.profile_completion || 0)}`}
                                style={{ width: `${studio.profile_completion || 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-8">
                              {studio.profile_completion || 0}%
                            </span>
                          </div>
                        </td>
                      )}
                      {isColumnVisible('verified') && (
                        <td data-column="verified" className="px-6 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                          <button disabled={pendingIds.has(studio.id)}
                            onClick={() => handleToggleVerified(studio, !studio.is_verified)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                              studio.is_verified ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                            title={studio.is_verified ? 'Studio is verified - click to unverify' : 'Studio is not verified - click to verify'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                studio.is_verified ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      )}
                      {isColumnVisible('featured') && (
                        <td data-column="featured" className="px-6 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                          <button disabled={pendingIds.has(studio.id)}
                            onClick={() => handleToggleFeatured(studio, !studio.is_featured)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                              studio.is_featured ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}
                            title={studio.is_featured ? 'Studio is featured - click to unfeature' : 'Studio is not featured - click to feature'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                studio.is_featured ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      )}
                      {isColumnVisible('lastLogin') && (
                        <td data-column="lastLogin" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {studio.last_login ? formatRelativeDate(studio.last_login) : (
                            <span className="text-gray-400 italic">No data</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('membershipExpires') && (
                        <td data-column="membershipExpires" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {studio.membership_expires_at ? (
                            <span className={
                              new Date(studio.membership_expires_at) < new Date()
                                ? 'text-red-600 font-medium'
                                : new Date(studio.membership_expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-orange-600 font-medium'
                                : ''
                            }>
                              {formatDate(studio.membership_expires_at)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </td>
                      )}
                      {isColumnVisible('updated') && (
                        <td data-column="updated" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(studio.updated_at)}
                        </td>
                      )}
                      {isColumnVisible('actions') && (
                        <td data-column="actions" className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => window.open(`/${studio.users.username}`, '_blank')}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleEditStudio(studio)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Edit
                            </button>
                            <button disabled={pendingIds.has(studio.id)}
                              onClick={() => handleDeleteStudio(studio)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    <tr id={`studio-desktop-${studio.id}`} hidden={!expandedStudios.has(studio.id)}><td colSpan={visibleColumnCount} className="px-6 pb-5">{expandedStudios.has(studio.id) && <StudioDetails studio={studio} />}</td></tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Desktop Load More Button */}
            {pagination.hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      {isNextWindow ? 'Next Studios' : 'Load More Studios'}
                      <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Desktop No Results */}
            {studios.length === 0 && !loading && !error && (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No studios found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Studio Modal - Now using unified EditProfileModal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onPersistedChange={handlePersistedChange}
        initialSection={initialEditSection}
        openSessionId={editSession}
        fallbackFocusRef={toolbarRef}
        mode="admin"
        {...(editingStudio?.users?.username && { targetUsername: editingStudio.users.username })}
        studioId={editingStudio?.id}
        userId={editingStudio?.users.id}
      />

      <AddStudioModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(message) => {
          showSuccess(message);
          fetchStudios();
        }}
      />

      {/* Featured Expiry Modal */}
      <Modal isOpen={featuredExpiryModalOpen} title="Set Featured expiry date" maxWidth="lg"
        onClose={() => { if (!featuredStudioId || !pendingIds.has(featuredStudioId)) setFeaturedExpiryModalOpen(false); }}>
        <div className="px-4 pt-5 pb-4 sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Set Featured Expiry Date
                  </h3>
                  <div className="mt-4">
                    <label htmlFor="featuredExpiry" className="block text-sm font-medium text-gray-700 text-left mb-2">
                      Featured Until <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="featuredExpiry"
                      disabled={!!featuredStudioId && pendingIds.has(featuredStudioId)}
                      value={featuredExpiryDate}
                      onChange={(e) => setFeaturedExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500 text-left">
                      This studio will remain featured until the selected date
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleConfirmFeatured}
                  disabled={!featuredExpiryDate || (!!featuredStudioId && pendingIds.has(featuredStudioId))}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={!!featuredStudioId && pendingIds.has(featuredStudioId)}
                  onClick={() => {
                    setFeaturedExpiryModalOpen(false);
                    setFeaturedStudioId(null);
                    setFeaturedExpiryDate('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
        </div>
      </Modal>
        </div>
      </div>
    </>
  );
}


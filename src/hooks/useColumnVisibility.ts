import { useState, useEffect } from 'react';

interface ColumnConfig {
  id: string;
  label: string;
  protected: boolean;
}

export function useColumnVisibility(storageKey: string, columnConfig: ColumnConfig[]) {
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  
  // Load column preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any protected columns that might have been saved
          const validHidden = parsed.filter(
            (col: string) => columnConfig.find(c => c.id === col && !c.protected)
          );
          setHiddenColumns(validHidden);
        }
      }
    } catch (err) {
      console.error('Failed to load column preferences:', err);
    }
  }, [storageKey, columnConfig]);
  
  // Save column preferences to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(hiddenColumns));
    } catch (err) {
      console.error('Failed to save column preferences:', err);
    }
  }, [storageKey, hiddenColumns]);
  
  const toggleColumn = (columnId: string) => {
    const column = columnConfig.find(c => c.id === columnId);
    if (column?.protected) return; // Can't toggle protected columns
    
    setHiddenColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };
  
  const resetColumns = () => {
    setHiddenColumns([]);
  };
  
  const isColumnVisible = (columnId: string) => !hiddenColumns.includes(columnId);
  
  const visibleColumnCount = columnConfig.filter(c => !hiddenColumns.includes(c.id)).length;
  
  return {
    hiddenColumns,
    toggleColumn,
    resetColumns,
    isColumnVisible,
    visibleColumnCount,
  };
}

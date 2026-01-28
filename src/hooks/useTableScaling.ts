import { useState, useCallback, useEffect, RefObject } from 'react';

export function useTableScaling(
  tableContainerRef: RefObject<HTMLDivElement>,
  tableRef: RefObject<HTMLTableElement>,
  dependencies: unknown[] = []
) {
  const [tableScale, setTableScale] = useState(1);
  
  // Compute table scale based on container vs table width
  const computeTableScale = useCallback(() => {
    const container = tableContainerRef.current;
    const table = tableRef.current;
    if (!container || !table) return;
    
    const containerWidth = container.offsetWidth;
    const tableWidth = table.scrollWidth;
    
    if (tableWidth > containerWidth) {
      // Table is wider than container, scale it down
      const scale = (containerWidth - 32) / tableWidth; // 32px for padding
      setTableScale(Math.max(scale, 0.5)); // Min scale of 50%
    } else {
      // Table fits, no scaling needed
      setTableScale(1);
    }
  }, [tableContainerRef, tableRef]);
  
  // Recalculate table scale when data or viewport changes
  useEffect(() => {
    computeTableScale();
    
    // Add resize listener
    const resizeObserver = new ResizeObserver(() => {
      computeTableScale();
    });
    
    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [computeTableScale, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    tableScale,
    computeTableScale,
  };
}

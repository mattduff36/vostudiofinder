import { createId } from '@paralleldrive/cuid2';

/**
 * ID Generation Utility for Migration
 * Handles conversion from legacy INTEGER IDs to modern CUID strings
 */

export class IdGenerator {
  private idMappings: Map<string, Map<number, string>> = new Map();

  /**
   * Generate a new CUID
   */
  generateId(): string {
    return createId();
  }

  /**
   * Get or create a CUID for a legacy ID
   * Maintains consistent mapping between legacy IDs and new CUIDs
   */
  getOrCreateId(tableName: string, legacyId: number): string {
    if (!this.idMappings.has(tableName)) {
      this.idMappings.set(tableName, new Map());
    }

    const tableMap = this.idMappings.get(tableName)!;
    
    if (tableMap.has(legacyId)) {
      return tableMap.get(legacyId)!;
    }

    const newId = this.generateId();
    tableMap.set(legacyId, newId);
    return newId;
  }

  /**
   * Get mapped ID if it exists, otherwise return null
   */
  getMappedId(tableName: string, legacyId: number): string | null {
    const tableMap = this.idMappings.get(tableName);
    return tableMap?.get(legacyId) || null;
  }

  /**
   * Pre-generate IDs for a batch of legacy records
   * Useful for maintaining referential integrity
   */
  preGenerateIds(tableName: string, legacyIds: number[]): Map<number, string> {
    if (!this.idMappings.has(tableName)) {
      this.idMappings.set(tableName, new Map());
    }

    const tableMap = this.idMappings.get(tableName)!;
    const newMappings = new Map<number, string>();

    for (const legacyId of legacyIds) {
      if (!tableMap.has(legacyId)) {
        const newId = this.generateId();
        tableMap.set(legacyId, newId);
        newMappings.set(legacyId, newId);
      } else {
        newMappings.set(legacyId, tableMap.get(legacyId)!);
      }
    }

    return newMappings;
  }

  /**
   * Get all mappings for a table
   */
  getTableMappings(tableName: string): Map<number, string> {
    return this.idMappings.get(tableName) || new Map();
  }

  /**
   * Get statistics about ID mappings
   */
  getStats(): { [tableName: string]: number } {
    const stats: { [tableName: string]: number } = {};
    
    for (const [tableName, mappings] of this.idMappings) {
      stats[tableName] = mappings.size;
    }
    
    return stats;
  }

  /**
   * Clear all mappings (use with caution)
   */
  clearMappings(): void {
    this.idMappings.clear();
  }

  /**
   * Export mappings for backup/debugging
   */
  exportMappings(): { [tableName: string]: [number, string][] } {
    const exported: { [tableName: string]: [number, string][] } = {};
    
    for (const [tableName, mappings] of this.idMappings) {
      exported[tableName] = Array.from(mappings.entries());
    }
    
    return exported;
  }

  /**
   * Import mappings from backup
   */
  importMappings(mappings: { [tableName: string]: [number, string][] }): void {
    this.idMappings.clear();
    
    for (const [tableName, entries] of Object.entries(mappings)) {
      const tableMap = new Map<number, string>();
      for (const [legacyId, newId] of entries) {
        tableMap.set(legacyId, newId);
      }
      this.idMappings.set(tableName, tableMap);
    }
  }
}

// Export a singleton instance
export const idGenerator = new IdGenerator();

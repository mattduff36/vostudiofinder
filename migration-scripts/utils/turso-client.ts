import { createClient, Client } from '@libsql/client';

/**
 * Turso Database Client Utility
 * Handles connection to the legacy Turso database for data migration
 */

export class TursoClient {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error(
        'Missing Turso configuration. Please ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in environment variables.'
      );
    }

    this.client = createClient({
      url,
      authToken,
    });
  }

  /**
   * Test the connection to the Turso database
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.execute('SELECT 1 as test');
      this.isConnected = result.rows.length > 0;
      console.log('✅ Turso database connection successful');
      return this.isConnected;
    } catch (error) {
      console.error('❌ Turso database connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Execute a query on the Turso database
   */
  async execute(sql: string, params?: any[]): Promise<any> {
    try {
      if (!this.isConnected) {
        await this.testConnection();
      }
      
      const result = await this.client.execute({
        sql,
        args: params || [],
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Query execution failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Get all tables in the database
   */
  async getTables(): Promise<string[]> {
    const result = await this.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);
    
    return result.rows.map((row: any) => row.name);
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const result = await this.execute(`PRAGMA table_info(${tableName});`);
    return result.rows;
  }

  /**
   * Get row count for a table
   */
  async getRowCount(tableName: string): Promise<number> {
    const result = await this.execute(`SELECT COUNT(*) as count FROM ${tableName};`);
    return result.rows[0].count;
  }

  /**
   * Get all data from a table with optional limit
   */
  async getAllFromTable(tableName: string, limit?: number): Promise<any[]> {
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const result = await this.execute(`SELECT * FROM ${tableName} ${limitClause};`);
    return result.rows;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.client.close();
    this.isConnected = false;
    console.log('🔌 Turso database connection closed');
  }
}

// Export a singleton instance
export const tursoClient = new TursoClient();

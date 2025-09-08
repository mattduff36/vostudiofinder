import { createClient } from '@libsql/client';

/**
 * Turso database connection for data migration
 */
export class TursoDatabase {
  private client: any = null;

  async connect() {
    if (this.client) return this.client;

    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
    }

    this.client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  /**
   * Get all users from Turso database
   */
  async getUsers() {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT 
        id,
        username,
        email,
        password,
        display_name,
        joined as created_at,
        joined as updated_at,
        avatar_url,
        role_id,
        status
      FROM shows_users 
      WHERE status = 1
      ORDER BY id
    `);
    
    return result.rows;
  }

  /**
   * Get all studios/user profiles from Turso database with metadata
   */
  async getStudios() {
    const client = await this.connect();
    
    // Get users with their metadata to create studio profiles
    const result = await client.execute(`
      SELECT 
        u.id,
        u.id as owner_id,
        u.display_name as name,
        u.username,
        u.email,
        u.joined as created_at,
        u.joined as updated_at,
        u.avatar_url,
        u.status
      FROM shows_users u
      WHERE u.status = 1 AND u.id > 1
      ORDER BY u.id
    `);
    
    return result.rows;
  }

  /**
   * Get user metadata from Turso database
   */
  async getUserMeta(userId) {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT meta_key, meta_value
      FROM shows_usermeta
      WHERE user_id = ?
    `, [userId]);
    
    const meta = {};
    result.rows.forEach(row => {
      meta[row.meta_key] = row.meta_value;
    });
    
    return meta;
  }

  /**
   * Get all user metadata for all users
   */
  async getAllUserMeta() {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT user_id, meta_key, meta_value
      FROM shows_usermeta
      ORDER BY user_id, meta_key
    `);
    
    const metaByUser = {};
    result.rows.forEach(row => {
      if (!metaByUser[row.user_id]) {
        metaByUser[row.user_id] = {};
      }
      metaByUser[row.user_id][row.meta_key] = row.meta_value;
    });
    
    return metaByUser;
  }

  /**
   * Get all reviews/comments from Turso database
   */
  async getReviews() {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT 
        id,
        user_id as reviewer_id,
        page as studio_id,
        5 as rating,
        content,
        status,
        date,
        updated
      FROM shows_comments 
      WHERE status = 1
      ORDER BY id
    `);
    
    return result.rows;
  }

  /**
   * Get comment votes (for review likes/dislikes)
   */
  async getCommentVotes() {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT 
        comment_id,
        user_id,
        type as vote_type,
        date as created_at
      FROM shows_commentvotes 
      ORDER BY comment_id, user_id
    `);
    
    return result.rows;
  }

  /**
   * Validate database connection and structure
   */
  async validateDatabase() {
    try {
      const client = await this.connect();
      
      // Check if required tables exist
      const tablesResult = await client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name IN ('shows_users', 'shows_usermeta', 'shows_comments', 'shows_commentvotes')
      `);
      
      const tableNames = tablesResult.rows.map((row: any) => row.name);
      const requiredTables = ['shows_users', 'shows_usermeta', 'shows_comments', 'shows_commentvotes'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));
      
      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
      }
      
      // Get table counts
      const counts: Record<string, any> = {};
      for (const table of requiredTables) {
        const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result.rows[0].count;
      }
      
      return {
        valid: true,
        tables: tableNames,
        counts,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all available tables in the database
   */
  async getAllTables() {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    return result.rows.map((row: any) => row.name);
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName: string) {
    const client = await this.connect();
    
    const result = await client.execute(`
      PRAGMA table_info(${tableName})
    `);
    
    return result.rows;
  }

  /**
   * Get sample data from a table
   */
  async getSampleData(tableName: string, limit: number = 5) {
    const client = await this.connect();
    
    const result = await client.execute(`
      SELECT * FROM ${tableName} LIMIT ${limit}
    `);
    
    return result.rows;
  }
}

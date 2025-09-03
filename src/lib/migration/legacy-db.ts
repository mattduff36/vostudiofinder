import mysql from 'mysql2/promise';

/**
 * Legacy MySQL database connection for data migration
 */
export class LegacyDatabase {
  private connection: mysql.Connection | null = null;

  async connect() {
    if (this.connection) return this.connection;

    this.connection = await mysql.createConnection({
      host: process.env.LEGACY_DB_HOST || 'localhost',
      user: process.env.LEGACY_DB_USER || 'root',
      password: process.env.LEGACY_DB_PASSWORD || '',
      database: process.env.LEGACY_DB_NAME || 'cl59-theshows2',
      charset: 'utf8mb4',
    });

    return this.connection;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  /**
   * Get all users from legacy database
   */
  async getUsers() {
    const connection = await this.connect();
    
    const [rows] = await connection.execute(`
      SELECT 
        id,
        username,
        email,
        password,
        display_name,
        avatar_url,
        role,
        email_verified,
        created_at,
        updated_at
      FROM users 
      ORDER BY id
    `);
    
    return rows as any[];
  }

  /**
   * Get all studios/contacts from legacy database
   */
  async getStudios() {
    const connection = await this.connect();
    
    const [rows] = await connection.execute(`
      SELECT 
        id,
        user_id as owner_id,
        name,
        description,
        studio_type,
        address,
        latitude as loc3,
        longitude as loc4,
        website_url,
        phone,
        is_premium,
        is_verified,
        status,
        created_at,
        updated_at
      FROM contacts 
      WHERE status = 'active'
      ORDER BY id
    `);
    
    return rows as any[];
  }

  /**
   * Get all reviews/comments from legacy database
   */
  async getReviews() {
    const connection = await this.connect();
    
    const [rows] = await connection.execute(`
      SELECT 
        id,
        user_id as reviewer_id,
        page_id as studio_id,
        rating,
        content,
        status,
        created_at as date,
        updated_at
      FROM comments 
      WHERE status IN ('approved', 'pending')
      ORDER BY id
    `);
    
    return rows as any[];
  }

  /**
   * Get comment votes (for review likes/dislikes)
   */
  async getCommentVotes() {
    const connection = await this.connect();
    
    const [rows] = await connection.execute(`
      SELECT 
        comment_id,
        user_id,
        vote_type,
        created_at
      FROM commentvotes 
      ORDER BY comment_id, user_id
    `);
    
    return rows as any[];
  }

  /**
   * Validate database connection and structure
   */
  async validateDatabase() {
    try {
      const connection = await this.connect();
      
      // Check if required tables exist
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('users', 'contacts', 'comments', 'commentvotes')
      `, [process.env.LEGACY_DB_NAME]);
      
      const tableNames = (tables as any[]).map(t => t.TABLE_NAME);
      const requiredTables = ['users', 'contacts', 'comments', 'commentvotes'];
      const missingTables = requiredTables.filter(t => !tableNames.includes(t));
      
      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
      }
      
      // Get table counts
      const counts: Record<string, any> = {};
      for (const table of requiredTables) {
        const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = (result as any[])[0].count;
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
}

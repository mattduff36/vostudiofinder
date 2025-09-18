import { generateCuid } from '../utils/id-generator';
import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';
import bcrypt from 'bcryptjs';

/**
 * User Data Mapper
 * Maps legacy Turso user data to Prisma User model
 */

export interface LegacyUser {
  id: number;
  email: string;
  username?: string;
  password?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  created?: string;
  updated?: string;
  active?: number;
  verified?: number;
  admin?: number;
  // Additional fields from different user tables
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: string;
}

export interface MappedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  private legacyIdMap: Map<number, string> = new Map();
  
  /**
   * Map a single legacy user to Prisma format
   */
  mapUser(legacyUser: LegacyUser): MappedUser {
    const newId = generateCuid();
    this.legacyIdMap.set(legacyUser.id, newId);

    // Generate username if not provided
    let username = legacyUser.username || legacyUser.email.split('@')[0];
    
    // Ensure username is unique and valid
    username = this.sanitizeUsername(username);

    // Generate display name
    let displayName = legacyUser.display_name;
    if (!displayName && (legacyUser.firstname || legacyUser.lastname)) {
      displayName = `${legacyUser.firstname || ''} ${legacyUser.lastname || ''}`.trim();
    }
    if (!displayName) {
      displayName = username;
    }

    // Determine role
    const role = legacyUser.admin === 1 ? 'ADMIN' : 'USER';

    // Parse dates
    const createdAt = legacyUser.created ? new Date(legacyUser.created) : new Date();
    const updatedAt = legacyUser.updated ? new Date(legacyUser.updated) : createdAt;

    // Handle email verification
    const emailVerified = legacyUser.verified === 1;

    return {
      id: newId,
      email: legacyUser.email.toLowerCase().trim(),
      username,
      displayName,
      avatarUrl: legacyUser.avatar_url || undefined,
      role,
      emailVerified,
      password: legacyUser.password, // Will be handled separately
      createdAt,
      updatedAt,
    };
  }

  /**
   * Map multiple legacy users
   */
  mapUsers(legacyUsers: LegacyUser[]): MappedUser[] {
    migrationLogger.info(`Mapping ${legacyUsers.length} legacy users`, 'USER_MAPPER');
    
    const mappedUsers: MappedUser[] = [];
    const emailSet = new Set<string>();
    const usernameSet = new Set<string>();
    
    for (const legacyUser of legacyUsers) {
      try {
        const mappedUser = this.mapUser(legacyUser);
        
        // Handle duplicate emails
        if (emailSet.has(mappedUser.email)) {
          migrationLogger.warn(`Duplicate email found: ${mappedUser.email}`, 'USER_MAPPER', {
            legacyId: legacyUser.id,
            newId: mappedUser.id
          });
          // Skip duplicate emails
          continue;
        }
        
        // Handle duplicate usernames
        let finalUsername = mappedUser.username;
        let counter = 1;
        while (usernameSet.has(finalUsername)) {
          finalUsername = `${mappedUser.username}${counter}`;
          counter++;
        }
        mappedUser.username = finalUsername;
        
        emailSet.add(mappedUser.email);
        usernameSet.add(finalUsername);
        mappedUsers.push(mappedUser);
        
      } catch (error) {
        migrationLogger.error(`Failed to map user ${legacyUser.id}`, 'USER_MAPPER', {
          error: error.message,
          legacyUser: { id: legacyUser.id, email: legacyUser.email }
        });
      }
    }
    
    migrationLogger.info(`Successfully mapped ${mappedUsers.length} users`, 'USER_MAPPER');
    return mappedUsers;
  }

  /**
   * Migrate users to Prisma database
   */
  async migrateUsers(mappedUsers: MappedUser[]): Promise<void> {
    migrationLogger.info(`Starting migration of ${mappedUsers.length} users`, 'USER_MAPPER');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of mappedUsers) {
      try {
        // Hash password if it exists
        let hashedPassword = undefined;
        if (user.password) {
          // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, etc.)
          if (user.password.startsWith('$2')) {
            hashedPassword = user.password;
          } else {
            hashedPassword = await bcrypt.hash(user.password, 12);
          }
        }

        await db.user.create({
          data: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            emailVerified: user.emailVerified,
            password: hashedPassword,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        });
        
        successCount++;
        
        if (successCount % 50 === 0) {
          migrationLogger.info(`Migrated ${successCount}/${mappedUsers.length} users`, 'USER_MAPPER');
        }
        
      } catch (error) {
        errorCount++;
        migrationLogger.error(`Failed to migrate user ${user.id}`, 'USER_MAPPER', {
          error: error.message,
          user: { id: user.id, email: user.email, username: user.username }
        });
      }
    }
    
    migrationLogger.info(`User migration completed`, 'USER_MAPPER', {
      total: mappedUsers.length,
      success: successCount,
      errors: errorCount
    });
    
    if (errorCount > 0) {
      throw new Error(`User migration completed with ${errorCount} errors`);
    }
  }

  /**
   * Get the new ID for a legacy user ID
   */
  getNewUserId(legacyId: number): string | undefined {
    return this.legacyIdMap.get(legacyId);
  }

  /**
   * Get all ID mappings
   */
  getIdMappings(): Map<number, string> {
    return new Map(this.legacyIdMap);
  }

  /**
   * Sanitize username to ensure it's valid
   */
  private sanitizeUsername(username: string): string {
    // Remove invalid characters and ensure it's not too long
    let sanitized = username
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 30);
    
    // Ensure it doesn't start with a number or special character
    if (!/^[a-z]/.test(sanitized)) {
      sanitized = 'user_' + sanitized;
    }
    
    // Ensure minimum length
    if (sanitized.length < 3) {
      sanitized = sanitized + '_user';
    }
    
    return sanitized;
  }

  /**
   * Validate mapped user data
   */
  private validateMappedUser(user: MappedUser): boolean {
    if (!user.email || !user.email.includes('@')) {
      return false;
    }
    
    if (!user.username || user.username.length < 3) {
      return false;
    }
    
    if (!user.displayName) {
      return false;
    }
    
    return true;
  }

  /**
   * Clean up legacy user data before mapping
   */
  cleanLegacyUserData(legacyUsers: LegacyUser[]): LegacyUser[] {
    return legacyUsers.filter(user => {
      // Filter out users with invalid emails
      if (!user.email || !user.email.includes('@')) {
        migrationLogger.warn(`Filtering out user with invalid email`, 'USER_MAPPER', {
          id: user.id,
          email: user.email
        });
        return false;
      }
      
      // Filter out users with extremely long emails (likely spam)
      if (user.email.length > 254) {
        migrationLogger.warn(`Filtering out user with extremely long email`, 'USER_MAPPER', {
          id: user.id,
          emailLength: user.email.length
        });
        return false;
      }
      
      return true;
    });
  }
}

export const userMapper = new UserMapper();

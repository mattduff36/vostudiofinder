import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Create MySQL connection to read from backup
async function createMySQLConnection() {
  // For now, we'll parse the SQL file directly since we don't have a running MySQL instance
  // In production, you'd connect to the actual database
  return null;
}

interface LegacyUser {
  id: number;
  username: string;
  email: string;
  password: string;
  display_name: string;
  joined: Date;
  status: number;
  role_id: number;
  reminder?: string;
  remember: string;
  upgrade?: string;
  expiry_date?: string;
}

// Map legacy roles to new roles
function mapLegacyRole(roleId: number): 'USER' | 'STUDIO_OWNER' | 'ADMIN' {
  switch (roleId) {
    case 7: // Premium/verified users in legacy system
      return 'STUDIO_OWNER';
    case 2: // Regular users
      return 'USER';
    case 1: // Admin (if exists)
    default:
      return 'USER';
  }
}

// Generate username from display name if needed
function generateUsername(displayName: string, email: string, id: number): string {
  // Clean display name
  let username = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  if (!username || username.length < 3) {
    // Fallback to email prefix
    username = email.split('@')[0].replace(/[^a-z0-9]/g, '').substring(0, 15);
  }
  
  // Add ID suffix to ensure uniqueness
  return `${username}_${id}`;
}

// Parse users from SQL dump (simplified version)
async function parseLegacyUsers(): Promise<LegacyUser[]> {
  const fs = require('fs');
  const path = require('path');
  
  const sqlFile = path.join(process.cwd(), '../_BACKUPS/old-site/MAIN DATABASE/cl59-theshows2.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  // Extract INSERT INTO users VALUES data
  const usersMatch = sqlContent.match(/INSERT INTO `users` VALUES (.+);/s);
  if (!usersMatch) {
    throw new Error('Could not find users data in SQL file');
  }
  
  // This is a simplified parser - in production you'd use a proper SQL parser
  const valuesText = usersMatch[1];
  const users: LegacyUser[] = [];
  
  // Parse each user record (this is simplified - real implementation would be more robust)
  const userMatches = valuesText.match(/\(([^)]+)\)/g);
  
  if (userMatches) {
    for (const userMatch of userMatches.slice(0, 50)) { // Limit to first 50 for testing
      try {
        // Extract values (simplified parsing)
        const values = userMatch.slice(1, -1).split(',');
        
        if (values.length >= 8) {
          const user: LegacyUser = {
            id: parseInt(values[0]),
            username: values[1].replace(/'/g, ''),
            email: values[2].replace(/'/g, ''),
            password: values[3].replace(/'/g, ''),
            display_name: values[4].replace(/'/g, ''),
            joined: new Date(values[5].replace(/'/g, '')),
            status: parseInt(values[6]),
            role_id: parseInt(values[7]),
            reminder: values[8]?.replace(/'/g, '') || undefined,
            remember: values[9]?.replace(/'/g, '') || '0',
            upgrade: values[10]?.replace(/'/g, '') || undefined,
            expiry_date: values[11]?.replace(/'/g, '') || undefined,
          };
          
          if (user.email && user.email.includes('@')) {
            users.push(user);
          }
        }
      } catch (error) {
        console.warn('Failed to parse user record:', error);
      }
    }
  }
  
  return users;
}

async function importUsers() {
  try {
    console.log('🚀 Starting legacy user import...');
    
    // Parse legacy users
    const legacyUsers = await parseLegacyUsers();
    console.log(`📊 Found ${legacyUsers.length} legacy users to import`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const legacyUser of legacyUsers) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: legacyUser.email }
        });
        
        if (existingUser) {
          console.log(`⏭️  Skipping existing user: ${legacyUser.email}`);
          skipped++;
          continue;
        }
        
        // Generate unique username
        const username = generateUsername(legacyUser.display_name, legacyUser.email, legacyUser.id);
        
        // Create new user
        await prisma.user.create({
          data: {
            email: legacyUser.email,
            username: username,
            displayName: legacyUser.display_name || legacyUser.username,
            role: mapLegacyRole(legacyUser.role_id),
            emailVerified: legacyUser.status === 1, // Assuming status 1 means verified
            createdAt: legacyUser.joined,
            // Note: We don't import passwords - users will need to sign in with OAuth or reset password
          }
        });
        
        imported++;
        console.log(`✅ Imported user: ${legacyUser.display_name} (${legacyUser.email})`);
        
      } catch (error) {
        console.error(`❌ Failed to import user ${legacyUser.email}:`, error);
        skipped++;
      }
    }
    
    console.log(`\n🎉 Import complete!`);
    console.log(`✅ Imported: ${imported} users`);
    console.log(`⏭️  Skipped: ${skipped} users`);
    
  } catch (error) {
    console.error('💥 Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  importUsers();
}

export { importUsers };

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        username: true, 
        displayName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${users.length} users in database:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName} (${user.username}) - ${user.email}`);
    });
    
    // Check if any have studio profiles
    const studiosCount = await prisma.studio.count();
    console.log(`\nFound ${studiosCount} studio profiles in database`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

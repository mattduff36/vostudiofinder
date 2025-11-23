import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addIsProfileVisible() {
  try {
    console.log('Adding is_profile_visible column to studios table...');
    
    // Add the column with default value true
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "studios" 
      ADD COLUMN IF NOT EXISTS "is_profile_visible" BOOLEAN NOT NULL DEFAULT true;
    `);
    
    console.log('✅ Successfully added is_profile_visible column');
    
    // Verify the column was added
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'studios' AND column_name = 'is_profile_visible';
    `);
    
    console.log('Column details:', result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addIsProfileVisible();


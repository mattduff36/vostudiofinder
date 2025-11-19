import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addUseCoordinatesField() {
  console.log('🔄 Adding use_coordinates_for_map field to user_profiles table...\n');

  try {
    // Add the column
    await prisma.$executeRaw`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS use_coordinates_for_map BOOLEAN DEFAULT false
    `;
    
    console.log('✅ Column added successfully!\n');
    
    // Verify the column exists
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'use_coordinates_for_map'
    `;
    
    if (result.length > 0) {
      console.log('✅ Verification successful: Column exists in database');
    } else {
      console.log('⚠️  Warning: Column not found in verification check');
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42701') {
      console.log('ℹ️  Column already exists - this is fine!');
    } else {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addUseCoordinatesField();


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileVisibility() {
  try {
    console.log('Testing is_profile_visible field...');
    
    // Test reading a studio with is_profile_visible field
    const studio = await prisma.studios.findFirst({
      select: {
        id: true,
        name: true,
        is_profile_visible: true,
      }
    });
    
    if (studio) {
      console.log('✅ Successfully read studio with is_profile_visible field');
      console.log('Studio:', studio);
    } else {
      console.log('⚠️ No studios found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileVisibility();







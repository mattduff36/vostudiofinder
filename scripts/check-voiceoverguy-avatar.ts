import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvatar() {
  try {
    const user = await prisma.users.findUnique({
      where: { username: 'VoiceoverGuy' },
      select: {
        username: true,
        avatar_url: true,
      },
    });
    
    console.log('VoiceoverGuy avatar data:', user);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAvatar();







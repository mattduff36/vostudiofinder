import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('GuyM@tt2025!', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mpdee.co.uk' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@mpdee.co.uk',
      username: 'admin_' + Math.random().toString(36).substring(7),
      displayName: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create some sample studios
  const studios = await Promise.all([
    prisma.studio.upsert({
      where: { id: 'studio1' },
      update: {},
      create: {
        id: 'studio1',
        name: 'Sample Studio 1',
        description: 'A professional voiceover studio',
        studioType: 'RECORDING',
        ownerId: adminUser.id,
      },
    }),
    prisma.studio.upsert({
      where: { id: 'studio2' },
      update: {},
      create: {
        id: 'studio2',
        name: 'Sample Studio 2',
        description: 'Another professional voiceover studio',
        studioType: 'RECORDING',
        ownerId: adminUser.id,
      },
    }),
  ]);

  console.log('✅ Sample studios created:', studios.length);

  // Create some sample FAQs
  const faqs = await Promise.all([
    prisma.faq.upsert({
      where: { id: 'faq1' },
      update: {},
      create: {
        id: 'faq1',
        question: 'What is VoiceoverStudioFinder?',
        answer: 'VoiceoverStudioFinder is a platform that helps you find professional voiceover recording studios.',
        sortOrder: 1,
      },
    }),
    prisma.faq.upsert({
      where: { id: 'faq2' },
      update: {},
      create: {
        id: 'faq2',
        question: 'How do I book a studio?',
        answer: 'You can browse studios and contact them directly through our platform.',
        sortOrder: 2,
      },
    }),
  ]);

  console.log('✅ Sample FAQs created:', faqs.length);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

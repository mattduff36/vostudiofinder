import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  try {
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const faqs = await prisma.faq.findMany({
      where: whereClause,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ],
    });

    const total = faqs.length;

    return NextResponse.json({
      faqs,
      statistics: {
        total
      }
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch FAQs' }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

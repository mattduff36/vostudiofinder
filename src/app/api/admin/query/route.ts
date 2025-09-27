import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return new NextResponse(JSON.stringify({ error: 'Query is required' }), { status: 400 });
    }

    // Basic security check - only allow SELECT statements
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return new NextResponse(JSON.stringify({ error: 'Only SELECT queries are allowed for security reasons' }), { status: 400 });
    }

    // Additional security checks
    const dangerousKeywords = ['drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate', 'exec', 'execute'];
    const queryLower = trimmedQuery.toLowerCase();
    
    for (const keyword of dangerousKeywords) {
      if (queryLower.includes(keyword)) {
        return new NextResponse(JSON.stringify({ error: `Query contains forbidden keyword: ${keyword}` }), { status: 400 });
      }
    }

    const startTime = Date.now();
    
    try {
      // Execute the raw query
      const results = await prisma.$queryRawUnsafe(query);
      const executionTime = Date.now() - startTime;

      // Convert Decimal fields to strings for JSON serialization
      const serializedResults = Array.isArray(results) ? results.map(item => {
        if (typeof item === 'object' && item !== null) {
          const serialized: any = {};
          for (const [key, value] of Object.entries(item)) {
            if (value && typeof value === 'object' && 'toFixed' in value) {
              // This is likely a Decimal
              serialized[key] = value.toString();
            } else {
              serialized[key] = value;
            }
          }
          return serialized;
        }
        return item;
      }) : results;

      return NextResponse.json({
        data: serializedResults,
        executionTime,
        rowCount: Array.isArray(serializedResults) ? serializedResults.length : 1
      });
    } catch (queryError: any) {
      console.error('Query execution error:', queryError);
      return new NextResponse(JSON.stringify({ 
        error: 'Query execution failed',
        details: queryError.message
      }), { status: 400 });
    }
  } catch (error) {
    console.error('Query API error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
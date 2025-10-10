import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      studio_services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        studio_services: {
          database: 'disconnected',
          api: 'operational'
        },
        error: 'Database connection failed'
      },
      { status: 503 }
    );
  }
}

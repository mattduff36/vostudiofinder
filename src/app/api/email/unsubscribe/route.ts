/**
 * POST /api/email/unsubscribe
 * Public endpoint to process unsubscribe requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { processUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { z } from 'zod';

const unsubscribeSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = unsubscribeSchema.parse(body);
    
    const result = await processUnsubscribeToken(validated.token);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        email: result.email,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }
    
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe' },
      { status: 500 }
    );
  }
}

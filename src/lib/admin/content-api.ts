import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

export class ContentError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function parseContent<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ContentError('Please check the submitted fields and try again.', 400);
  return parsed.data;
}

export function contentError(error: unknown, fallback: string) {
  if (error instanceof ContentError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return NextResponse.json({ error: 'This record no longer exists. Refresh the list.' }, { status: 404 });
  }
  console.error(fallback, error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'UNEXPECTED_ERROR');
  return NextResponse.json({ error: fallback }, { status: 500 });
}

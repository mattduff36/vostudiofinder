import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { EmailAdminError } from './template-store';

export function emailAdminFailure(error: unknown, fallback: string): NextResponse {
  if (error instanceof EmailAdminError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'This operation already exists. Reload its state before trying again.' }, { status: 409 });
    if (error.code === 'P2034') return NextResponse.json({ error: 'The record changed concurrently. Review current state and retry the same operation.' }, { status: 409 });
    if (error.code === 'P2003') return NextResponse.json({ error: 'This record is still used by a campaign and cannot be deleted.' }, { status: 409 });
    if (error.code === 'P2025') return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  }
  console.error(fallback); // Never include recipient datasets, provider payloads or tokens.
  return NextResponse.json({ error: fallback }, { status: 500 });
}
